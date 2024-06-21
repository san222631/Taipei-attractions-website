
from fastapi import *
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import mysql.connector
from mysql.connector import Error
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from jwt import PyJWTError





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

#使用者註冊
class registerInfo(BaseModel):
    name: str
    email: str
    password: str
    
@app.post("/api/user")
async def signup(register_Info: registerInfo):
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        register_name = register_Info.name
        register_email = register_Info.email
        register_password = register_Info.password

        #確認有沒有一樣的email已經在資料庫
        cursor.execute("SELECT * FROM member WHERE email = %s", (register_email,))
        existingUser = cursor.fetchone()

        if (existingUser):
            cursor.close()
            conn.close()
            raise HTTPException(
                status_code=400,
                detail={
                    "error": True,
                    "message": "email已經註冊過"
                }
            )
           

        register_query = """
        INSERT INTO member (name, email, hashed_password)
        VALUES
        (%s, %s, %s)
        """
        cursor.execute(
            register_query,
            (register_name, register_email, register_password)
        )
        conn.commit()
        return {"註冊成功": True}
    except mysql.connector.Error as err:
        cursor.close()
        conn.close()
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": "MySQL出了問題"
            }
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
		

            





#確認使用者的JWT有沒有正確
#{"data": {"id": 1,"name": "彭彭彭","email": "ply@ply.com"}}
#要回傳給使用者的資料規定格式
class verified_user(BaseModel):
    id: int
    name: str
    email: str

@app.get("/api/user/auth")
async def authenticate(request: Request):
    #從前端送過來的headers get"Authorization"然後decode
    auth_header = request.headers.get("Authorization")
    print(auth_header)
    if auth_header is None or not auth_header.startswith("Bearer"):
        raise HTTPException(status_code=401, detail="無授權")
    extracted_token = auth_header[len("Bearer "):]
    try:
        payload = jwt.decode(extracted_token, SECRET_KEY, algorithms=[ALGORITHM])
    except PyJWTError:
        payload = None
        return payload
    if payload is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    #資料庫內驗證使用者
    conn =None
    cursor = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        user_email = payload.get("email")
        print(user_email)
        cursor.execute(
            "SELECT id, name, email FROM member WHERE email = %s",
            (user_email,)
        )
        verified_user = cursor.fetchone()
        cursor.close()
        conn.close()
        print(verified_user)
        if not verified_user:
            return {"null"}
        return {"data": verified_user}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


    





    

#檢查使用者信箱+密碼，確認有的話給一個JWT
#我指定要符合的Pydantic model
#如果token_type是bearer，通常代表user要把這個token放在"authorization" header裡面寄request來
#例如authorization: Bearer <token>
class Token(BaseModel):
    token: str
#使用者要登入時給的資料
class UserInfo(BaseModel):
    email: str
    password: str
#JWT Secret & Algorithm
SECRET_KEY = "wehelp"
ALGORITHM = "HS256"
#加密&驗證密碼 password hashing context
#pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
#DEVELOPMENT_MODE = True #正在開發，完成後才變成False
     
#檢查使用者信箱+密碼，確認有的話給一個JWT
#{"email": "ply@ply.com","password": "12345678"}
#"response_model" 是一個parameter，用在確保這個api送回去的response符合我指定的pydantic model
@app.put("/api/user/auth", response_model=Token)
#"user_auth"是一個request body parameter，名字我可自訂
async def login(user_info: UserInfo):
    conn = None
    cursor = None
    #進資料庫檢查有沒有這個帳號密碼
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        received_email = user_info.email
        received_password = user_info.password
        print(user_info.email)
        cursor.execute(
            "SELECT id, name, email, hashed_password FROM member WHERE email = %s",
            (received_email,)
            )
        fetched_user = cursor.fetchone()
        cursor.close()
        conn.close()
        #verify_password = pwd_context.verify(received_password, fetched_user["hashed_password"])
        print(fetched_user)
        #要return None嗎?
        if not fetched_user:
            raise HTTPException(
                status_code=400,
                detail={
                "error": True,
                "message": "找不到這位使用者"                    
                }
            )
        if not received_password == fetched_user["hashed_password"]:
            raise HTTPException(
                status_code=400,
                detail={
                "error": True,
                "message": "密碼錯誤"                    
                }
            )         
        
        #在token加入有效的時間，然後加密
        original_data = {
            "id": fetched_user["id"],
            "name": fetched_user["name"],
            "email": fetched_user["email"]}
        print(original_data)
        data_to_encode = original_data.copy()
        expire_time = datetime.now(timezone.utc) + timedelta(minutes=30)
        data_to_encode.update({"exp": expire_time})
        print(data_to_encode)
        encoded_jwt = jwt.encode(data_to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return {"token": encoded_jwt} 

        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": "伺服器內部錯誤"
            }
        )
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        
    

    


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
        #print("找到的結果", result)
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


     

