#"rate"/"direction"/"name"/"date"/
#"longitude"/"REF_WP"/"avBegin"/"langinfo"/
#"MRT"/"SERIAL_NO"/"RowNumber"/"CAT"/
#"MEMO_TIME"/"POI"/"file"/"idpt"/
#"latitude"/"description"/"_id"/"avEnd"/
#"address"/

#網頁上需要的資料 ***mrt資料有一筆是null在陽明山 !!!
#***image是list
#"direction"="transport"/"name"="name"/"longitude"="lng"/"MRT"="mrt"/
#"SERIAL_NO"?/"RowNumber"?/"CAT"="category"/"file"="image"/
#"latitude"="lat"/"description"="description"/"address"="address"

#ATTRACTION API 要有query = page & keyword(用使用者給的字對mrt做比對，若無，則比對name)

import json
import mysql.connector
from mysql.connector import Error
import os

def load_json_to_mysql():
    # Print current working directory (for debugging purposes)
    print("Current working directory:", os.getcwd())



    # Database connection
    try:
        conn = mysql.connector.connect(
            host='localhost',
            user='wehelp',
            password='wehelp',
            database='tp_attractions'
        )
        cursor = conn.cursor()
        print("Successfully connected to the database.")
        
        # Open and load the JSON file
        with open('data/taipei-attractions.json', 'r', encoding='utf-8') as file:
            data = json.load(file)  # Load JSON file
            results = data['result']['results']  # Access the 'results' list

        # Prepare SQL statement
        columns = ['direction', 'name', 'longitude', 'MRT', 'SERIAL_NO', 'CAT', 'latitude', 'description', 'address']
        placeholders = ', '.join(['%s'] * len(columns))
        column_str = ', '.join(columns)
        insert_query = f"INSERT INTO usefuldata ({column_str}) VALUES ({placeholders});"

        # Insert data into the table
        for item in results:
            # Create a tuple of data in the order of columns specified, filling missing keys with None
            values = tuple(item.get(key) for key in columns)
            cursor.execute(insert_query, values)  # Execute the insert query
            
            #找最近一個被儲存的id
            attraction_id = cursor.lastrowid
            image_urls = item['file'].split('https://')
            image_urls = ['https://' + url for url in image_urls if url.strip()]
            valid_extensions = ('.jpg', '.JPG', '.png', '.PNG')
            filtered_urls = [url for url in image_urls if url.endswith(valid_extensions)]
            
            for url in filtered_urls:
                cursor.execute("INSERT INTO images (attraction_id, url) VALUES (%s, %s)", (attraction_id, url))
        conn.commit()
        print("Data has been successfully inserted.")

    except Error as e:
        print(f"An error occurred: {e}")
        conn.rollback()

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
            print("Database connection closed.")

if __name__ == '__main__':
    load_json_to_mysql()




