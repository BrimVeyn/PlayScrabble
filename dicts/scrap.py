from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
import string
import requests
import re
import json


def getWordList(letter):
    results = {}
    input_file = letter.upper() + "_list.txt"
    with open(input_file) as sourceFile:
        i = 0
        for word in sourceFile:
            if i == 1:
                break
            print(word[0], ":", i)
            url_prefix = 'https://1mot.net/'
            url_suffix = "penser"
            # url_suffix = word.lower()
            html = requests.get(url_prefix + url_suffix)

            soup = BeautifulSoup(html.content, 'html.parser')
            someh4 = soup.find_all("h4")

            filtered = {url_suffix: ""}
            for elem in someh4:
                if (elem.get_text().find("extrait") > 0):
                    for sibling in elem.find_all_next():
                        if (str(sibling).startswith("<h4>")):
                            break
                        if (str(sibling).startswith("<ul>")):
                            filtered["penser"] += (sibling.get_text("\n"))
                            break

            print(json.dumps(filtered))
            i += 1

    # with open(letter.upper() + "_def.json", "w", encoding="utf-8") as outputFile:
    #     json.dump(results, outputFile, ensure_ascii=False, indent=4)


getWordList('a')



# with ThreadPoolExecutor(max_workers=26) as executor:
#     executor.map(getWordList, string.ascii_uppercase)
