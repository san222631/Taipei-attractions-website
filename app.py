
from fastapi import *
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import mysql.connector
from mysql.connector import Error
from fastapi.staticfiles import StaticFiles


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
	return FileResponse("./static/index.html", media_type="text/html")
@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
	return FileResponse("./static/thankyou.html", media_type="text/html")



DB_CONFIG = {
    'host': 'localhost',
    'user': 'newuser',
    'password': 'user_password',
    'database': 'mydatabase',
    'charset': 'utf8'
}

#for /api/attractions 取得景點資料
def fetch_data(page: int, keyword: Optional[str]):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SET SESSION group_concat_max_len = 1000000;")

        query = """
        SELECT usefuldata.*, GROUP_CONCAT(images.url SEPARATOR ' ') AS image_urls
        FROM usefuldata
        LEFT JOIN images ON images.attraction_id = usefuldata.id
        """
        params = []
        if keyword:
            query += " WHERE usefuldata.name LIKE %s OR usefuldata.mrt LIKE %s"
            like_keyword = f'%{keyword}%'
            params.extend([like_keyword, like_keyword])

        query += " GROUP BY usefuldata.id LIMIT %s, 12"
        params.append(page * 12)

        cursor.execute(query, params)
        results = cursor.fetchall()
        return results
    except Exception as e:
        print(f"Internal Server Error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message":"伺服器內部錯誤"
                })  
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()

@app.get("/api/attractions/")
def get_attractions(page: int = 0, keyword: Optional[str] = Query(None)):
    data = fetch_data(page, keyword)
    if not data:
        raise HTTPException(status_code=404, detail="No Data, No attractions found.")
    
    # Determine if there's a next page
    next_page = page + 1 if len(data) == 12 else None
    
    # Format response
    response = {
        "nextPage": next_page,
        "data": [{
            "id": item['id'],
            "name": item['name'],
            "category": item['CAT'],
            "description": item['description'],
            "address": item['address'],
            "transport": item['direction'],
            "mrt": item['MRT'],
            "lat": item['latitude'],
            "lng": item['longitude'],
            "images": item['image_urls'].split(' ')
        } for item in data]
    }
    return response


#___________________________________________________________________________________________
#for /api/attraction/{attractionId} 根據景點編號取得景點資料
def fetch_data_by_id(attractionId: int):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SET SESSION group_concat_max_len = 1000000;")

        query = """
        SELECT usefuldata.*, GROUP_CONCAT(images.url SEPARATOR ' ') AS image_urls
        FROM usefuldata
        LEFT JOIN images ON images.attraction_id = usefuldata.id
        WHERE usefuldata.id = %s
        GROUP BY usefuldata.id;
        """
        #print("This is ID query", attractionId) #找錯誤
        cursor.execute(query, (attractionId,))
        result = cursor.fetchone()
        #print("找到的結果", result)
        return result
    except Error as e:
        print(f"Error fetching data: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()    
         

@app.get("/api/attraction/{attractionId}")
def get_attraction_by_id(attractionId: int):
    attraction_details = fetch_data_by_id(attractionId)
    if not attraction_details:
         return JSONResponse(
            status_code=400,
            content={
                "error": True,
                "message": "景點編號不正確"
            }
        )
    # Format response
    response = {
        "data": {
            "id": attraction_details['id'],
            "name": attraction_details['name'],
            "category": attraction_details['CAT'],
            "description": attraction_details['description'],
            "address": attraction_details['address'],
            "transport": attraction_details['direction'],
            "mrt": attraction_details['MRT'],
            "lat": attraction_details['latitude'],
            "lng": attraction_details['longitude'],
            "images": attraction_details['image_urls'].split(' ')
        }
    }
    return response



#___________________________________________________________________________________________
#for /api/mrts 取得捷運站名稱列表，按照周邊景點的數量由大到小排列
def fetch_mrts():
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        #print("Connection object:", conn)
        cursor = conn.cursor(dictionary=True)
        #print("Cursor object:", cursor)
        #cursor.execute("SET SESSION group_concat_max_len = 1000000;")

        query = """
        SELECT MRT, COUNT(*) AS mrt_count
        FROM usefuldata
        WHERE MRT IS NOT NULL
        GROUP BY MRT
        ORDER BY mrt_count DESC;
        """
        #print("This is ID query", attractionId) #找錯誤
        cursor.execute(query)
        result = cursor.fetchall()
        print("找到的結果", result)
        return result

    except Exception as e:
        print(f"Internal Server Error: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message":"伺服器內部錯誤"
                })
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()  


@app.get("/api/mrts")
def get_mrts():
    mrts = fetch_mrts()
    if not mrts:
        raise HTTPException(
        status_code=500,
        detail={
            "error": True,
            "message": "捷運列表不存在"
        }
    )
    # Format response
    response = {
        "data": [
            mrt['MRT']
        for mrt in mrts
        ]
    }
    return response


     

