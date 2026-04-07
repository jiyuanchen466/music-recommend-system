import requests
from lxml import etree


def get_img():
    url = 'https://pixabay.com/zh/images/search/winter/'
    headers = {
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers).text
    html = etree.HTML(response)
    div_list = html.xpath('//div[@class="column--HhhwH"]/div')
    print(len(div_list))
    
if __name__ == '__main__':
    get_img()