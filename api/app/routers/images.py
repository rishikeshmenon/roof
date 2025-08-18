from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import httpx
import io
from urllib.parse import unquote

router = APIRouter()

@router.get("/proxy")
async def proxy_image(url: str):
    """
    Proxy images through our backend to avoid CORS issues with Facebook CDN
    """
    try:
        # Decode the URL if it's encoded
        decoded_url = unquote(url)
        
        # Validate that it's a Facebook/Instagram image URL for security
        allowed_domains = [
            'scontent-', 'fbcdn.net', 'cdninstagram.com', 
            'instagram.com', 'facebook.com'
        ]
        
        if not any(domain in decoded_url for domain in allowed_domains):
            raise HTTPException(status_code=400, detail="Invalid image source")
        
        # Set headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Fetch the image
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(decoded_url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Image not found")
            
            # Determine content type
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            # Stream the image back
            return StreamingResponse(
                io.BytesIO(response.content),
                media_type=content_type,
                headers={
                    'Cache-Control': 'public, max-age=3600',  # Cache for 1 hour
                    'Access-Control-Allow-Origin': '*',
                }
            )
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Image request timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to proxy image: {str(e)}")
