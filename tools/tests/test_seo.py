import base64
import copy
import hashlib
import json
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from tools.build import publishable
from tools.seo import MARKER, ORIGIN, json_ld, program_html, program_path, safe_url, write_public_pages
from tools.tests.test_build import PROGRAM


class SeoTest(unittest.TestCase):
    def test_real_content_is_readable_without_js_and_escaped(self):
        p=copy.deepcopy(PROGRAM)
        p['name']['ru']='Пример <script>alert(1)</script>'
        p['textConditions']=[{'kind':'documents','ru':'Выписка оценок <обязательно>','evidence':'SECRET_EVIDENCE'}]
        result=program_html(p,{'TR':'Турция'})
        self.assertIn('Выписка оценок &lt;обязательно&gt;',result)
        self.assertNotIn('SECRET_EVIDENCE',result)
        self.assertNotIn('<script>alert(1)</script>',result)
        self.assertIn(f'rel="canonical" href="{ORIGIN}/programs/primer.html"',result)
        self.assertEqual(result.count('<h1>'),1)
        self.assertIn('Турция',result)

    def test_structured_data_has_matching_csp_hash(self):
        tag,digest=json_ld({'name':'</script>\u2028'})
        raw=tag.split('>',1)[1].rsplit('</script>',1)[0]
        self.assertNotIn('</script>',raw)
        self.assertEqual(json.loads(raw)['name'],'</script>\u2028')
        self.assertEqual(digest,"'sha256-"+base64.b64encode(hashlib.sha256(raw.encode()).digest()).decode()+"'")

    def test_unsafe_links_and_paths_are_rejected(self):
        for url in ['javascript:alert(1)','data:text/html,x','https://user:password@example.com/','//evil.example/']:
            self.assertIsNone(safe_url(url))
        self.assertEqual(safe_url('https://example.com/apply?a=1&b=2'),'https://example.com/apply?a=1&b=2')
        with self.assertRaises(ValueError):program_path({'id':'../outside'})

    def test_only_published_approved_records_get_urls_and_stale_pages_leave(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'js').mkdir();(root/'js/filter.js').write_text("export const COUNTRY_RU = {TR: 'Турция'};",encoding='utf-8')
            p=copy.deepcopy(PROGRAM);draft=copy.deepcopy(PROGRAM);draft.update(id='draft',status='draft')
            write_public_pages(root,publishable([p,draft]))
            folder=root/'programs'
            self.assertTrue((folder/'primer.html').exists());self.assertFalse((folder/'draft.html').exists())
            urls=[n.text for n in ET.parse(root/'sitemap.xml').getroot().findall('{*}url/{*}loc')]
            self.assertIn(ORIGIN+'/programs/primer.html',urls);self.assertEqual(len(urls),5)
            self.assertNotIn('#',''.join(urls))
            (folder/'personal.html').write_text('not generated',encoding='utf-8')
            write_public_pages(root,[])
            self.assertFalse((folder/'primer.html').exists());self.assertTrue((folder/'personal.html').exists())

    def test_expected_or_missing_dates_are_not_presented_as_current_admission(self):
        p=copy.deepcopy(PROGRAM);p['deadline']={'closes':'1999-01-01','confidence':'expected'}
        result=program_html(p,{'TR':'Турция'})
        self.assertNotIn('1999-01-01',result)
        self.assertIn('Условия могли измениться',result)


if __name__=='__main__':unittest.main()
