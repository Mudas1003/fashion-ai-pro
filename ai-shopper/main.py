import json
import requests
import re
import ast

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel
from groq import Groq

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API KEYS
GROQ_API_KEY = "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"
SERP_API_KEY = "f5b262df6f10a5340823b5097b99059b4e8973b3889501d39bd27db2c403cd70"

client = Groq(api_key=GROQ_API_KEY)

# ---------------- INPUT MODEL ---------------- #
class UserInput(BaseModel):
    gender: str
    age: int
    occasion: str
    outfits: list[str]
    budget: int

# ---------------- ROOT ---------------- #
@app.get("/")
def home():
    return {
        "message": "Fashion AI Backend Running 🚀"
    }

# ---------------- PRICE EXTRACTOR ---------------- #
def extract_price(price_str):
    if not price_str:
        return None
    
    cleaned = re.sub(r"[^\d.]", "", str(price_str))
    
    if cleaned == "":
        return None
    
    try:
        value = float(cleaned)
        # USD -> INR conversion (if price is in USD - under $1000)
        if value < 1000:
            value = value * 83
        return int(value)
    except:
        return None

# ---------------- PRODUCT FETCH ---------------- #
def fetch_products(query):
    url = "https://serpapi.com/search.json"
    
    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": SERP_API_KEY,
        "num": 10
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        products = []
        
        if "shopping_results" in data:
            for item in data["shopping_results"][:8]:
                link = item.get("link") or item.get("product_link") or item.get("source")
                price = item.get("price")
                title = item.get("title")
                image = item.get("thumbnail")
                
                # Skip if missing critical info
                if not title or not image:
                    continue
                
                # Get rating if available
                rating = item.get("rating")
                
                products.append({
                    "title": title,
                    "price": str(price) if price else "N/A",
                    "link": link,
                    "image": image,
                    "rating": rating if rating else None
                })
        
        return products
    
    except Exception as e:
        print(f"Error fetching products for {query}: {e}")
        return []

# ---------------- COMBO GENERATOR ---------------- #
def get_top_combos(products_by_category, total_budget):
    combos = []
    categories = list(products_by_category.keys())
    
    if len(categories) < 2:
        return []
    
    # Try all category combinations
    for i in range(len(categories)):
        for j in range(i + 1, len(categories)):
            cat1 = categories[i]
            cat2 = categories[j]
            
            for p1 in products_by_category[cat1][:8]:  # Limit to top 5 products per category
                for p2 in products_by_category[cat2][:8]:
                    price1 = extract_price(p1["price"]) or 0
                    price2 = extract_price(p2["price"]) or 0
                    total = price1 + price2
                    
                    # Calculate score (higher is better)
                    budget_score = 0
                    if total <= total_budget:
                        # Perfect budget match
                        budget_score = 100 * (1 - (abs(total - total_budget) / total_budget))
                    else:
                        # Over budget penalty
                        budget_score = max(0, 100 - ((total - total_budget) / total_budget) * 100)
                    
                    # Price balance score (prefer similarly priced items)
                    balance_score = max(0, 100 - (abs(price1 - price2) / max(price1, price2)) * 100) if price1 > 0 and price2 > 0 else 50
                    
                    # Final score (weighted)
                    score = (budget_score * 0.6) + (balance_score * 0.4)
                    
                    combos.append({
                        "score": round(score, 2),
                        "total_price": total,
                        "items": [p1, p2]
                    })
    
    # Sort by score and remove duplicates (same combination of products)
    unique_combos = []
    seen = set()
    
    for combo in sorted(combos, key=lambda x: x["score"], reverse=True):
        # Create a unique key based on product titles
        items_key = tuple(sorted([item["title"] for item in combo["items"]]))
        if items_key not in seen:
            seen.add(items_key)
            unique_combos.append(combo)
    
    return unique_combos[:5]  # Return top 5 combos

# ---------------- CLEAN AI RESPONSE ---------------- #
def clean_ai_response(content):
    """Clean and parse AI response to ensure valid JSON"""
    try:
        # Try direct JSON parse first
        return json.loads(content)
    except:
        pass
    
    try:
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
    except:
        pass
    
    try:
        # Try to extract JSON from any code blocks
        json_match = re.search(r'```\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
    except:
        pass
    
    try:
        # Try to find any JSON-like structure
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
    except:
        pass
    
    # If all fails, return empty dict
    return {}

# ---------------- SHOP ROUTE ---------------- #
@app.post("/shop")
def generate_outfit(data: UserInput):
    try:
        print(f"Received request: {data.dict()}")
        
        prompt = f"""
You are an expert AI fashion stylist. Generate specific product search queries for the user.

USER DETAILS:
- Gender: {data.gender}
- Age: {data.age}
- Occasion: {data.occasion}
- Outfit Request: {', '.join(data.outfits)}
- Budget: ₹{data.budget}

IMPORTANT RULES:
1. ONLY generate categories that match the outfit request
2. For "{', '.join(data.outfits)}", suggest {len(data.outfits)} relevant categories
3. Keep queries specific and searchable on Google Shopping
4. Include gender in queries (men/women)
5. Include occasion and style keywords
6. Focus on quality, trendy items

RETURN ONLY VALID JSON. Example format:
{{
  "category1": ["specific search query 1", "specific search query 2"],
  "category2": ["specific search query 1", "specific search query 2"]
}}

For a {data.gender} looking for {', '.join(data.outfits)} for {data.occasion}, generate 2-3 relevant categories.
"""

        # Get AI response
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        print(f"AI Response: {content}")
        
        # Parse AI response
        parsed = clean_ai_response(content)
        
        if not parsed:
            # Fallback categories based on input
            parsed = {}
            if "shirt" in str(data.outfits).lower() or "top" in str(data.outfits).lower():
                parsed[f"{data.gender}_shirt"] = [f"{data.gender} {data.occasion} shirt", f"trendy {data.gender} top"]
            if "pant" in str(data.outfits).lower() or "jeans" in str(data.outfits).lower():
                parsed[f"{data.gender}_pants"] = [f"{data.gender} {data.occasion} pants", f"stylish {data.gender} trousers"]
            if "dress" in str(data.outfits).lower():
                parsed[f"{data.gender}_dress"] = [f"{data.gender} {data.occasion} dress", f"elegant {data.gender} gown"]
            if "suit" in str(data.outfits).lower():
                parsed[f"{data.gender}_suit"] = [f"{data.gender} {data.occasion} suit", f"formal {data.gender} blazer"]
        
        # Ensure we have at least one category
        if not parsed:
            parsed = {
                f"{data.gender}_outfit": [
                    f"{data.gender} {data.occasion} outfit",
                    f"trendy {data.gender} clothing"
                ]
            }
        
        result = {}
        budget_per_category = data.budget // max(len(parsed.keys()), 1)
        
        # Fetch products for each category
        for category, queries in parsed.items():
            result[category] = []
            
            for query in queries[:2]:  # Limit to 2 queries per category
                products = fetch_products(query)
                
                # Filter by budget
                filtered = []
                for p in products:
                    price = extract_price(p["price"])
                    if price and price <= budget_per_category * 1.5:
                        filtered.append(p)
                
                # Take top products
                if filtered:
                    result[category].extend(filtered[:4])
                else:
                    result[category].extend(products[:3])
        
        # Remove duplicates
        for category in result:
            seen_titles = set()
            unique_products = []
            for product in result[category]:
                if product["title"] not in seen_titles:
                    seen_titles.add(product["title"])
                    unique_products.append(product)
            result[category] = unique_products[:6]  # Keep top 6 per category
        
        # Generate top combos
        top_combos = get_top_combos(result, data.budget)
        
        # Prepare response
        response_data = {
            "products": result,
            "top_combos": top_combos,
            "summary": {
                "total_categories": len(result),
                "total_products": sum(len(products) for products in result.values()),
                "total_combos": len(top_combos),
                "occasion": data.occasion,
                "budget": data.budget
            }
        }
        
        print(f"Sending response with {len(result)} categories and {len(top_combos)} combos")
        return JSONResponse(content=response_data)
    
    except Exception as e:
        print(f"Error in generate_outfit: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "details": "Internal server error"}
        )

