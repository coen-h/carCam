import azure.functions as func
import json
import os
import time
import logging
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import base64
import io
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from msrest.authentication import CognitiveServicesCredentials

os.environ['DATABASE_URL'] = "postgresql://postgres.brzwbydqyoqsjybjuqwg:taiemaljamous@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
os.environ['DB_HOST'] = "aws-0-us-east-2.pooler.supabase.com"
os.environ['DB_NAME'] = "postgres"
os.environ['DB_USER'] = "postgres"
os.environ['DB_PASSWORD'] = "taiemaljamous"
os.environ['DB_PORT'] = "5432"

os.environ['COMPUTER_VISION_SUBSCRIPTION_KEY'] = "CAzLhFIyAb9UgdHXVlHQolaPZA4E0PVZHkH8io7SPDVFGGrFtu3TJQQJ99BGACL93NaXJ3w3AAAFACOGXiTd"
os.environ['COMPUTER_VISION_ENDPOINT'] = "https://cv-parkinglot.cognitiveservices.azure.com/"

def datetime_serializer(obj):
    """JSON serializer for datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def is_base64_image(data):
    """Check if the data is a base64 encoded image"""
    try:
        # Check if it looks like base64 (no http/https and contains base64 characters)
        if data.startswith(('http://', 'https://')):
            return False
        
        # Try to decode as base64
        decoded = base64.b64decode(data)
        return len(decoded) > 0
    except Exception:
        return False

def process_image_data(image_data):
    """Process image data - either URL or base64"""
    if is_base64_image(image_data):
        # It's base64 data - convert to bytes stream
        try:
            decoded_image = base64.b64decode(image_data)
            image_stream = io.BytesIO(decoded_image)
            return image_stream, "base64"
        except Exception as e:
            logging.error(f"Error decoding base64 image: {str(e)}")
            raise ValueError("Invalid base64 image data")
    else:
        # It's a URL
        return image_data, "url"

app = func.FunctionApp()

def get_db_connection():
    """Create and return a database connection"""
    try:
        # Try using DATABASE_URL if provided (Supabase connection string format)
        database_url = os.environ.get('DATABASE_URL')
        if database_url:
            conn = psycopg2.connect(database_url)
            return conn
        
        # Fallback to individual parameters
        conn = psycopg2.connect(
            host=os.environ.get('DB_HOST'),
            database=os.environ.get('DB_NAME'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD'),
            port=os.environ.get('DB_PORT', '5432'),
            sslmode='require'  # Supabase requires SSL
        )
        return conn
    except Exception as e:
        logging.error(f"Database connection error: {str(e)}")
        raise

def check_or_create_plate(plate_number):
    """Check if plate exists in list table, create if it doesn't. Returns the plate info."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if plate exists
        cursor.execute("SELECT * FROM list WHERE plate_number = %s", (plate_number,))
        existing_plate = cursor.fetchone()
        
        if existing_plate:
            logging.info(f"Plate {plate_number} already exists in database")
            return dict(existing_plate)
        else:
            # Create new plate entry
            cursor.execute("""
                INSERT INTO list (plate_number, known, created_at) 
                VALUES (%s, %s, %s) 
                RETURNING *
            """, (plate_number, False, datetime.now()))
            
            new_plate = cursor.fetchone()
            conn.commit()
            logging.info(f"Created new plate entry for {plate_number}")
            return dict(new_plate)
            
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error checking/creating plate {plate_number}: {str(e)}")
        raise
    finally:
        if conn:
            conn.close()

def create_event(plate_number, image_url=None):
    """Create a new event for the spotted plate"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Create new event
        cursor.execute("""
            INSERT INTO event (plate_number, clip_url, entry_time, exit_time, known, resolved) 
            VALUES (%s, %s, %s, %s, %s) 
            RETURNING *
        """, (plate_number, image_url, datetime.now(), datetime.now(), False, False))
        
        new_event = cursor.fetchone()
        conn.commit()
        logging.info(f"Created new event for plate {plate_number}")
        return dict(new_event)
        
    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Error creating event for plate {plate_number}: {str(e)}")
        raise
    finally:
        if conn:
            conn.close()

@app.route(route="process_license_plate")
def process_license_plate(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')

    try:
        # Get the image data from the request
        image_data = None
        
        # Try to get image_url from query parameters first
        image_data = req.params.get('image_url')
        
        # If not in query params, try to get from request body
        if not image_data:
            try:
                req_body = req.get_json()
                if req_body:
                    image_data = req_body.get('image_url') or req_body.get('image')
            except ValueError:
                pass
        
        if not image_data:
            return func.HttpResponse(
                json.dumps({
                    "error": "Please provide an image_url parameter (URL or base64) in the query string or request body",
                    "examples": {
                        "url": "?image_url=https://example.com/image.jpg",
                        "base64": '{"image_url": "iVBORw0KGgoAAAANSUhEUgAA..."}'
                    }
                }, default=datetime_serializer),
                status_code=400,
                mimetype="application/json"
            )

        # Get credentials from environment variables
        subscription_key = os.environ.get('COMPUTER_VISION_SUBSCRIPTION_KEY')
        endpoint = os.environ.get('COMPUTER_VISION_ENDPOINT')
        
        # Check for database connection requirements
        required_db_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
        missing_db_vars = [var for var in required_db_vars if not os.environ.get(var)]
        
        if not subscription_key or not endpoint:
            return func.HttpResponse(
                json.dumps({
                    "error": "Missing required environment variables: COMPUTER_VISION_SUBSCRIPTION_KEY and COMPUTER_VISION_ENDPOINT"
                }),
                status_code=500,
                mimetype="application/json"
            )
            
        if missing_db_vars:
            return func.HttpResponse(
                json.dumps({
                    "error": f"Missing required database environment variables: {', '.join(missing_db_vars)}"
                }),
                status_code=500,
                mimetype="application/json"
            )

        # Initialize the Computer Vision client
        credentials = CognitiveServicesCredentials(subscription_key)
        computervision_client = ComputerVisionClient(endpoint, credentials)

        # Process the image data (URL or base64)
        try:
            processed_image, image_type = process_image_data(image_data)
            logging.info(f"Processing image type: {image_type}")
        except ValueError as e:
            return func.HttpResponse(
                json.dumps({"error": str(e)}, default=datetime_serializer),
                status_code=400,
                mimetype="application/json"
            )

        # Call the OCR method on the image
        if image_type == "url":
            read_response = computervision_client.read(processed_image, raw=True)
        else:  # base64
            read_response = computervision_client.read_in_stream(processed_image, raw=True)
        
        # Get the operation location (URL with an ID at the end) from the response
        read_operation_location = read_response.headers["Operation-Location"]
        
        # Grab the ID from the URL
        operation_id = read_operation_location.split("/")[-1]
        
        # Call the "GET" API and wait for it to retrieve the results
        max_attempts = 30  # Prevent infinite loop
        attempts = 0
        
        while attempts < max_attempts:
            read_result = computervision_client.get_read_result(operation_id)
            if read_result.status not in ['notStarted', 'running']:
                break
            time.sleep(1)
            attempts += 1
        
        if attempts >= max_attempts:
            return func.HttpResponse(
                json.dumps({"error": "OCR operation timed out"}),
                status_code=500,
                mimetype="application/json"
            )

        # Process the results and handle database operations
        license_plates = []
        all_text = []
        database_operations = []
        
        if read_result.status == OperationStatusCodes.succeeded:
            for text_result in read_result.analyze_result.read_results:
                for line in text_result.lines:
                    all_text.append({
                        "text": line.text,
                        "bounding_box": line.bounding_box
                    })
                    
                    # Check if the line contains a license plate number
                    if any(char.isdigit() for char in line.text) and any(char.isalpha() for char in line.text):
                        plate_text = line.text.strip().upper()  # Normalize plate text
                        
                        license_plates.append({
                            "text": plate_text,
                            "bounding_box": line.bounding_box
                        })
                        
                        try:
                            # Check or create plate in database
                            plate_info = check_or_create_plate(plate_text)
                            
                            # Create event for this plate spotting
                            event_info = create_event(plate_text, image_data if image_type == "url" else None)
                            
                            database_operations.append({
                                "plate": plate_info,
                                "event": event_info,
                                "action": "processed"
                            })
                            
                        except Exception as db_error:
                            logging.error(f"Database operation failed for plate {plate_text}: {str(db_error)}")
                            database_operations.append({
                                "plate_text": plate_text,
                                "error": str(db_error),
                                "action": "failed"
                            })

        # Return the results
        result = {
            "status": "success",
            "license_plates": license_plates,
            "database_operations": database_operations,
            "all_detected_text": all_text,
            "image_type": image_type,
            "image_source": image_data if image_type == "url" else "base64_data",
            "processed_at": datetime.now().isoformat()
        }
        
        return func.HttpResponse(
            json.dumps(result, indent=2, default=datetime_serializer),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        return func.HttpResponse(
            json.dumps({
                "error": f"An error occurred: {str(e)}"
            }, default=datetime_serializer),
            status_code=500,
            mimetype="application/json"
        )