#!/usr/bin/python3

# Logging!
# https://www.loggly.com/ultimate-guide/python-logging-basics/
import logging
import os
import re
from tornado.web import authenticated, Application, RequestHandler, StaticFileHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop, PeriodicCallback
from tornado.httputil import HTTPHeaders
from pymongo import MongoClient
import requests
import json
import secrets
import logging
import warnings
import asyncio
import time

from decouple import config

debug = False

abs_path = os.path.dirname(os.path.abspath(__file__))
rel_path = "templates/custom_product_template.json"
template_path = os.path.join(abs_path, rel_path)

warnings.filterwarnings("ignore", message="Unverified HTTPS request is being made")

#=======================================================================================
# MongoSession

class MongoSession():
	def __init__(self, _url, _username, _password, _database):
		self.client = MongoClient(_url,
			username = _username,
			password = _password,
			authSource = 'admin',
			authMechanism = 'SCRAM-SHA-1'
		)
		self.db = self.client[_database]
		self.custom = self.db['custom']

#=======================================================================================
# Mongo DB Helpers

async def findDBEntries(query):
	if not isinstance(query,dict):
		raise Exception('query must be a dictionary object')
	if debug: print('[API] searching DB:', query)
	try:
		result = await IOLoop.current().run_in_executor(None, lambda: mongo.custom.find(query))
	except Exception as e:
		raise e
	return result

async def insertDBEntry(product):
	dbEntry = createDBEntry(product)
	if debug: print('[API] Adding entry to DB:', dbEntry)
	try:
		result = await IOLoop.current().run_in_executor(None, lambda: mongo.custom.insert_one(dbEntry))
	except Exception as e:
		raise e
	if debug: print('[API] DB entry result:', result.inserted_id)

async def setDBEntryActive(productId, value):
	if not isinstance(value,bool):
		raise Excpetion('value must be boolean')
	mongo_filter = { 'productId' : productId }
	mongo_update = { '$set' : { 'isActive' : value }}
	if debug: print('[API] Setting isActive to %s.' % value)
	try:
		result = await IOLoop.current().run_in_executor(None, lambda: mongo.custom.update_one(mongo_filter, mongo_update))
	except Exception as e:
		raise e
	if debug: print('[API] DB entry result:', result.raw_result)
	
async def setDBEntryRemoved(productId, value):
	if not isinstance(value,bool):
		raise Excpetion('value must be boolean')
	mongo_filter = { 'productId' : productId }
	mongo_update = { '$set' : { 'isRemoved' : value }}
	if debug: print('[API] Setting isRemoved to %s.' % value)
	try:
		result = await IOLoop.current().run_in_executor(None, lambda: mongo.custom.update_one(mongo_filter, mongo_update))
	except Exception as e:
		raise e
	if debug: print('[API] DB entry result:', result.raw_result)

async def deleteDBEntry(productId):
	if debug: print('[API] deleting entry from DB:', productId)
	try:
		result = await IOLoop.current().run_in_executor(None, lambda: mongo.custom.delete_one({'productId':productId}))
	except Exception as e:
		raise e
	if debug: print('[API] DB entry result:', result.raw_result)

#=======================================================================================
# Internal Squarespace API Calls 

async def createProduct(productData):
	url='%s/product/' % config('API_ENDPOINT')
	if debug: print('[API] Sending create product requests to:',url)
	try:
		response = await IOLoop.current().run_in_executor(None, lambda: session.post(url, data=json.dumps(productData), verify=False))
	except Exception as e:
		if debug: print('[API] something went wrong:', e)
		raise e
	product = response.json()
	if debug: print('[API] Create Product Result: %s' % product)
	await insertDBEntry(product)
	return product

async def deleteProduct(productId):
	if debug: print('[API] Deleting product: %s' % productId)
	url='%s/product/%s' % (config('API_ENDPOINT'),productId)
	try:
		response = await IOLoop.current().run_in_executor(None, lambda: session.delete(url, verify=False))
	except Exception as e:
		if debug: print('[API] Product deletion failed. Reason:',e)
		raise e
	if debug: print('[API] Delete result: %s' % response.status_code)
	if response.status_code == 204 or response.status_code == 404:
		await deleteDBEntry(productId)
	return response.status_code

async def uploadImage(productId, image_data):
	if debug: print('[API] Uploading Image to product: %s' % productId)
	url='%s/product/%s/image/' % (config('API_ENDPOINT'),productId)
	try:
		response = await IOLoop.current().run_in_executor(None, lambda: session.post(url, files={'file':image_data}, verify=False))
	except Exception as e:
		if debug: print('[API] Image upload failed. Reason:',e)
		deleteProduct(productId)
		raise e
	if debug: print('[API] Image upload result: %s' % response.json())
	await setDBEntryActive(productId,True)
	return response.json()['imageId']

#=======================================================================================
# Helpers 

async def generateProductData(image_name):
	SKU = os.urandom(16).hex()
	productTemplate = json.loads(open(template_path,'r').read())
	productTemplate['storePageId']=config('STORE_PAGE_ID')
	productTemplate['name']=image_name
	productTemplate['urlSlug']='custom-'+SKU
	productTemplate['variants'][0]['sku']=SKU
	return productTemplate

def pngCheck(image_data):
	if image_data[1:4] == b'PNG' and image_data[-7:-4] == b'END':
		if debug: print('[API] image passed type check')
		pass
	else:
		if debug: print('[API] image failed type check')
		raise Exception('INVALID REQUEST: Invalid file type.')
	return

def createDBEntry(product):
	now = time.time()
	later = now + (1 * 24 * 60 * 60) # one day later
	entry = {}
	entry['productId'] = product['id']
	entry['sku'] = product['variants'][0]['sku']
	entry['creationTime'] = str(now)
	entry['expirationTime'] = str(later)
	entry['isActive'] = False
	entry['isRemoved'] = False
	entry['app'] = 'gradientes'
	return entry

#=======================================================================================
# TORNADO HANDLERS

class BaseHandler(RequestHandler):
	def get_current_user(self):
		return self.get_secure_cookie("user")

class GradientesHandler(BaseHandler):
	def get(self):
		response={}
		print(self.current_user)
		print("Cookies: ", self.request.cookies)
		print("----")
		self.set_status(200)
		if not self.current_user:
			value = secrets.token_urlsafe(32)
			self.set_secure_cookie("user", value)
		self.render("gradientes.html")
	@authenticated
	async def post(self):
		if debug: print('[API] Got Something!')
		image_name = None
		image_data = None
		try:
			# Any post request to this endpoint requires an image 
			if 'image' in self.request.files:
				# may implement custom name in the future
				# image_name = self.request.files['image'][0]['filename']
				# if debug: print('[API] image_name', image_name)
				image_data = self.request.files['image'][0]['body'] # raw bytes of the image file
				if debug: print('[API] image_data',type(image_data))
			else:
				raise Exception('INVALID REQUEST: Missing required data.')

			# Check to see if it's a PNG
			pngCheck(image_data)

			productData = await generateProductData(image_name='Gradientes Throw')
			
			# create a new product page on squarespace
			if debug: print('[API] productData:', productData)

			product = await createProduct(productData)

			productId = product['id']

			# print('[TEST] uploadImage()')
			await uploadImage(productId, image_data)
			
			response = {'message':product['url']}

			if debug: print('[API] sending the redirect back:', str(response))
			
			self.set_status(201)
			self.write(response)
		except Exception as e:
			print('[API] Exception caught:',e)
			self.set_status(500)
			self.write({'error':str(e)})

#=======================================================================================
# TORNADO APPLICATION BUILDER

def make_app():
	settings = dict(
		template_path = os.path.join(abs_path, 'templates'),
		static_path = os.path.join(abs_path, 'static'),
		cookie_secret = config('COOKIE_SECRET'),
		debug = debug
	)
	urls = [
		(r'/', GradientesHandler)
	]
	return Application(urls, **settings)

if __name__ == "__main__":
	try:
		session = requests.session()
		session.headers.update({'Authorization' : 'Bearer '+config('TEST_KEY')})
		
		mongo = MongoSession(
			config('MONGO_URL'),
			config('MONGO_USERNAME'),
			config('MONGO_PASSWORD'),
			config('MONGO_DB')
		)
		application = make_app()
		http_server = HTTPServer(application,
			ssl_options = {
				"certfile":config('SSL_CRT'),
				"keyfile":config('SSL_KEY')
			}
		)
		http_server.listen(config('PORT'))
		main_loop = IOLoop.current()
		main_loop.start()
	except Exception as e:
		print(e)
	finally:
		IOLoop.current().stop()
		exit()
