import requests
from bs4 import BeautifulSoup
from pymongo.mongo_client import MongoClient
from datetime import datetime, timedelta
import os
import logging
from http.server import BaseHTTPRequestHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_users(soup):
    users = {}
    try:
        rows = soup.find_all('tr')[1:]  # Skip the header row
        for row in rows:
            columns = row.find_all('td')
            if len(columns) == 4:
                user_name = columns[1].text.strip()
                solved_tasks = int(columns[2].text.strip())
                users[user_name] = solved_tasks
    except Exception as e:
        logger.error(f"Error parsing users: {str(e)}")
    return users

def fetch_cses_data():
    cookies = {
        'PHPSESSID': os.environ.get('CSES_PHPSESSID', 'b614b76259290f9aaccda2a2afdd428118304b9a'),
    }

    headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Cookie': f'PHPSESSID={cookies["PHPSESSID"]}',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    }

    users = {}
    try:
        for page in [1, 2]:
            response = requests.get(f'https://cses.fi/problemset/stats/friends/p/{page}', 
                                 cookies=cookies, 
                                 headers=headers,
                                 timeout=10)
            response.raise_for_status()
            users.update(get_users(BeautifulSoup(response.text, "html.parser")))
            
        return users
    except Exception as e:
        logger.error(f"Error fetching CSES data: {str(e)}")
        return None

def update_mongodb(users_data):
    if not users_data:
        return False
        
    try:
        uri = os.environ.get('MONGODB_URI')
        if not uri:
            logger.error("MongoDB URI not found in environment variables")
            return False
            
        client = MongoClient(uri)
        db = client.get_database("leaderboard")
        collection = db.get_collection("CSES")
        
        for user, tasks in users_data.items():
            document = collection.find_one({"username":user});
            todayDate = (datetime.today()).strftime("%d/%m/%Y")
            if document :
                streak = int(document["streak"])
                prevSolved = document['solved'].get((datetime.today() -  timedelta(days=1)).strftime("%d/%m/%Y")) 
                currSolved = prevSolved 
                if  prevSolved != None and  prevSolved < tasks:
                    streak += int(todayDate != document['lastUpdate'])
                    currSolved = tasks
                else :
                    streak = 0
                document['solved'][todayDate] = currSolved
                collection.update_one({"username":user} , {"$set": {"solved": document['solved'] , "streak": streak  , "questionSolved" : tasks , "lastUpdate" : (datetime.today()).strftime("%d/%m/%Y") }})
            else :
                data = {"username":user,"solved":{todayDate : tasks},"streak" : 0 , "questionSolved" : tasks }
                result = collection.insert_one(data)
        client.close()
        return True
    except Exception as e:
        logger.error(f"Error updating MongoDB: {str(e)}")
        return False

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Check if this is a cron job request
            is_cron = self.headers.get('X-Vercel-Cron') == 'true'
            
            if not is_cron and self.path != '/fetch':
                self.send_response(404)
                self.end_headers()
                return
                
            users_data = fetch_cses_data()
            success = update_mongodb(users_data)
            
            self.send_response(200 if success else 500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(bytes('{"status": "success"}' if success else '{"status": "error"}', "utf-8"))
            
        except Exception as e:
            logger.error(f"Handler error: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(bytes('{"status": "error"}', "utf-8"))

# For local testing
if __name__ == "__main__":
    users_data = fetch_cses_data()
    success = update_mongodb(users_data)
    print("Update successful" if success else "Update failed")
