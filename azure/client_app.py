import cv2
import base64
import requests
import json
import time
from datetime import datetime

# Azure Function URL - replace with your actual function URL
AZURE_FUNCTION_URL = "https://fa-licence-001.azurewebsites.net/api/process_license_plate?code=mbkOuyQO_KiwAqrYCTimopkcAYxEZH9aF5ze3SL5gpW6AzFu9b_l6Q=="

def capture_photo_from_webcam():
    """Capture a photo from the Logitech webcam"""
    print("Initializing webcam...")
    
    # Initialize the camera (0 is usually the default camera)
    cap = cv2.VideoCapture(0)
    
    # Set camera properties for better quality
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)  # Set width
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)  # Set height
    cap.set(cv2.CAP_PROP_FPS, 30)  # Set frame rate
    
    if not cap.isOpened():
        print("Error: Could not open webcam")
        return None
    
    print("Webcam initialized.")
    print("Live preview is showing. Press 'c' to capture photo or 'q' to quit")
    
    while True:
        # Capture frame-by-frame
        ret, frame = cap.read()
        
        if not ret:
            print("Error: Could not read frame from webcam")
            break
        
        # Display the frame
        cv2.imshow('Webcam - Press "c" to capture, "q" to quit', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('c'):  # Capture photo
            print("Photo captured!")
            cap.release()
            cv2.destroyAllWindows()
            return frame
        elif key == ord('q'):  # Quit
            print("Exiting...")
            cap.release()
            cv2.destroyAllWindows()
            return None
    
    cap.release()
    cv2.destroyAllWindows()
    return None

def encode_image_to_base64(image):
    """Encode OpenCV image to base64 string"""
    try:
        # Encode image to JPG format with high quality
        _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        # Convert to base64
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return image_base64
    except Exception as e:
        print(f"Error encoding image: {e}")
        return None

def send_image_to_azure_function(image_base64):
    """Send base64 encoded image to Azure Function"""
    try:
        # Prepare the request payload - using image_url field as expected by the function
        payload = {
            "image_url": image_base64
        }
        
        print("Sending image to Azure Function for processing...")
        print(f"Image size: {len(image_base64)} characters")
        
        # Send POST request to Azure Function
        headers = {
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            AZURE_FUNCTION_URL,
            json=payload,
            headers=headers,
            timeout=45  # Increased timeout for OCR processing
        )
        
        # Check response status
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            print(f"Error: Azure Function returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("Error: Request timed out. The Azure Function may be taking too long to process.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error sending request to Azure Function: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def display_results(result):
    """Display the processing results"""
    if not result:
        print("No results to display.")
        return
    
    print("\n" + "="*60)
    print("PROCESSING RESULTS")
    print("="*60)
    
    if result.get('status') == 'success':
        print(f"  Processing successful!")
        print(f"  Processed at: {result.get('processed_at')}")
        print(f"   Image type: {result.get('image_type', 'unknown')}")
        
        license_plates = result.get('license_plates', [])
        print(f"  License plates detected: {len(license_plates)}")
        
        if license_plates:
            print("  License plates found:")
            for i, plate in enumerate(license_plates, 1):
                print(f"   {i}. {plate.get('text', 'Unknown')}")
                if plate.get('bounding_box'):
                    print(f"      Bounding box: {plate['bounding_box']}")
        else:
            print("  No license plates detected in the image")
        
        # Display database operations
        db_operations = result.get('database_operations', [])
        if db_operations:
            print(f"\n💾 Database Operations ({len(db_operations)}):")
            for i, operation in enumerate(db_operations, 1):
                if operation.get('action') == 'processed':
                    plate_info = operation.get('plate', {})
                    event_info = operation.get('event', {})
                    
                    plate_number = plate_info.get('plate_number', 'Unknown')
                    is_known = plate_info.get('known', False)
                    status = "  KNOWN" if is_known else "  UNKNOWN/NEW"
                    
                    print(f"   {i}. {plate_number} - {status}")
                    print(f"      Plate ID: {plate_info.get('id', 'N/A')}")
                    print(f"      Event ID: {event_info.get('id', 'N/A')}")
                    print(f"      Entry time: {event_info.get('entry_time', 'N/A')}")
                    
                elif operation.get('action') == 'failed':
                    print(f"   {i}.   Failed: {operation.get('plate_text', 'Unknown')}")
                    print(f"      Error: {operation.get('error', 'Unknown error')}")
        
        # Display all detected text
        all_text = result.get('all_detected_text', [])
        if all_text:
            print(f"\n  All detected text ({len(all_text)} items):")
            for i, text_item in enumerate(all_text, 1):
                print(f"   {i}. \"{text_item.get('text', '')}\"")
                
    else:
        print(f"  Processing failed: {result.get('error', 'Unknown error')}")
    
    print("="*60)

def main():
    """Main function to run the manual license plate detection"""
    print("  Manual License Plate Detection System")
    print("  Jetson Nano Client")
    print("-" * 40)
    print("Make sure your Logitech webcam is connected to the Jetson Nano")
    print("Ensure your Azure Function URL is correctly configured")
    print()
    
    while True:
        print("\nOptions:")
        print("1. Capture and process image")
        print("2. Test connection to Azure Function")
        print("3. Exit")
        
        choice = input("Enter your choice (1, 2, or 3): ").strip()
        
        if choice == '1':
            # Capture photo from webcam
            print("\n  Starting image capture...")
            captured_image = capture_photo_from_webcam()
            
            if captured_image is not None:
                # Save the captured image locally (optional)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"captured_license_plate_{timestamp}.jpg"
                cv2.imwrite(filename, captured_image)
                print(f"  Image saved locally as '{filename}'")
                
                # Encode image to base64
                print("  Encoding image...")
                image_base64 = encode_image_to_base64(captured_image)
                
                if image_base64:
                    # Send to Azure Function
                    result = send_image_to_azure_function(image_base64)
                    
                    # Display results
                    display_results(result)
                else:
                    print("  Failed to encode image")
            else:
                print("  No image captured")
                
        elif choice == '2':
            # Test connection to Azure Function
            print("\n🔗 Testing connection to Azure Function...")
            try:
                # Send a simple test request
                test_payload = {
                    "image_url": "https://picsum.photos/300/200"
                }
                
                response = requests.post(
                    AZURE_FUNCTION_URL,
                    json=test_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response.status_code == 200:
                    print("  Connection successful!")
                    result = response.json()
                    print(f"   Status: {result.get('status')}")
                    print(f"   Response received at: {result.get('processed_at')}")
                else:
                    print(f"  Connection failed with status code: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
            except Exception as e:
                print(f"  Connection test failed: {str(e)}")
                
        elif choice == '3':
            print("  Goodbye!")
            break
        else:
            print("  Invalid choice. Please enter 1, 2, or 3.")

if __name__ == "__main__":
    print("  Configuration Check:")
    print(f"Azure Function URL: {AZURE_FUNCTION_URL}")
    
    if "your-function-app" in AZURE_FUNCTION_URL:
        print("   WARNING: Please update the AZURE_FUNCTION_URL with your actual Azure Function URL!")
        print("   Example: https://myapp.azurewebsites.net/api/process_license_plate")
        print("   Note: No function key needed if using authLevel: 'anonymous'")
        print()
    else:
        print("  URL appears to be configured")
    
    main()
