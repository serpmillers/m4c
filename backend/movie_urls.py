# Helper to generate streaming platform URLs
def get_streaming_url(source: str, title: str, year: int = None) -> str:
    """Generate search URL for a movie on a streaming platform"""
    query = f"{title}"
    if year:
        query += f" {year}"
    query_encoded = query.replace(" ", "+")
    
    platform_urls = {
        "Netflix": f"https://www.netflix.com/search?q={query_encoded}",
        "Amazon Prime": f"https://www.amazon.com/s?k={query_encoded}&i=prime-instant-video",
        "HBO Max": f"https://www.hbomax.com/search?q={query_encoded}",
        "Hulu": f"https://www.hulu.com/search?q={query_encoded}",
        "Disney+": f"https://www.disneyplus.com/search?q={query_encoded}",
        "Paramount+": f"https://www.paramountplus.com/search?q={query_encoded}",
    }
    
    # Fallback to JustWatch if platform not found
    return platform_urls.get(source, f"https://www.justwatch.com/us/search?q={query_encoded}")


