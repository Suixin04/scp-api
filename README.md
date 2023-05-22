# SCP Foundation Unofficial API
To be used with data from the [SCP Foundation WebScraper](https://github.com/rakhadjo/scp-scraper) also by me.

### Get Started
Clone this repo and `cd` to the cloned directory. Then run:
```sh
npm i
node server.js
```

### Schema 
(from the repo mentioned above)
```json
{
    "id": "str",
    "class:" "str",
    "containment": "str",
    "description": "str",
    "more_info": "json"
}
```
e.g.
```json
{
    "id": "SCP-343",
    "class:" "Safe",
    "containment": "SCP-343 resides in a 6.1m by 6.1m (20 ft by..."
    "description": "CP-343 is a male, seemingly race-less, humanoid in...",
    "more_info": {
        "Addendum #343-1": "SCP-343, colloquially nicknamed...."
    }
}
```
