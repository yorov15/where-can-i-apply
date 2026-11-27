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
            self.assertIn(ORIGIN+'/programs/primer.html',urls);self.assertEqual(len(urls),11)
            self.assertIn(ORIGIN+'/topics/gosudarstvennye-stipendii.html',urls);self.assertIn(ORIGIN+'/countries/',urls)
            self.assertNotIn('#',''.join(urls))
            (folder/'personal.html').write_text('not generated',encoding='utf-8')
            write_public_pages(root,[])
            self.assertFalse((folder/'primer.html').exists());self.assertTrue((folder/'personal.html').exists())
            self.assertFalse((root/'topics/polnoe-finansirovanie.html').exists())

    def test_expected_or_missing_dates_are_not_presented_as_current_admission(self):
        p=copy.deepcopy(PROGRAM);p['deadline']={'closes':'1999-01-01','confidence':'expected'}
        result=program_html(p,{'TR':'Турция'})
        self.assertNotIn('1999-01-01',result)
        self.assertIn('Условия могли измениться',result)


def make(pid,country,**changes):
    p=copy.deepcopy(PROGRAM);p.update(id=pid,hostCountry=country,kind='university');p['name']={'ru':pid.upper()}
    p.update(changes);return p


class CountryTopicPagesTest(unittest.TestCase):
    def build(self,programs,today='2026-11-27'):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup)
        root=Path(tmp.name);(root/'js').mkdir()
        (root/'js/filter.js').write_text("export const COUNTRY_RU = {CN: 'Китай', TJ: 'Таджикистан', TR: 'Турция'};",encoding='utf-8')
        write_public_pages(root,programs,today=today)
        return root

    def test_country_page_needs_three_programs_and_skips_home_country(self):
        confirmed={'opens':None,'closes':'2027-03-15','confidence':'confirmed'}
        cn=[make('cn-a',"CN",deadline=confirmed),make('cn-b',"CN"),make('cn-c',"CN",coverage={'tuition':False,'living':None})]
        root=self.build(cn+[make(f'tj-{i}','TJ') for i in range(3)]+[make('tr-a','TR')])
        page=(root/'countries/cn.html').read_text(encoding='utf-8')
        self.assertIn('Учёба в Китае',page);self.assertIn(MARKER,page)
        self.assertIn('подача до <time datetime="2027-03-15">15 марта 2027</time>',page)
        self.assertIn('Учёба платная или покрыта частично',page)
        self.assertNotIn('2027-02-20',page)  # ожидаемая дата не выдаётся за срок
        self.assertIn('href="../programs/cn-a.html"',page)
        self.assertFalse((root/'countries/tj.html').exists())
        self.assertFalse((root/'countries/tr.html').exists())
        urls={n.findtext('{*}loc'):n.findtext('{*}lastmod') for n in ET.parse(root/'sitemap.xml').getroot().findall('{*}url')}
        self.assertEqual(urls[ORIGIN+'/countries/cn.html'],'2026-09-03')
        self.assertIn('href="../countries/cn.html"',(root/'programs/index.html').read_text(encoding='utf-8'))

    def test_past_confirmed_deadline_leaves_deadline_page(self):
        past=make('past','CN',deadline={'closes':'2026-11-01','confidence':'confirmed'})
        soon=make('soon','CN',deadline={'closes':'2026-12-01','confidence':'confirmed'})
        later=make('later','CN',deadline={'closes':'2027-01-05','confidence':'confirmed'})
        page=(self.build([later,past,soon])/'topics/sroki-podachi.html').read_text(encoding='utf-8')
        self.assertNotIn('PAST',page)
        self.assertLess(page.index('SOON'),page.index('LATER'))

    def test_language_topic_uses_only_explicit_no_limit(self):
        free=make('free','CN');free['eligibility']=dict(free['eligibility'],language={'noLimit':True})
        unknown=make('unknown','CN')
        page=(self.build([free,unknown])/'topics/bez-ielts.html').read_text(encoding='utf-8')
        self.assertIn('FREE',page);self.assertNotIn('UNKNOWN',page)

    def test_empty_topics_are_not_written_and_old_ones_leave(self):
        paid=make('paid','CN',coverage={'tuition':False,'living':False})
        root=self.build([paid])
        self.assertFalse((root/'topics/polnoe-finansirovanie.html').exists())
        (root/'topics/manual.html').write_text('hand made',encoding='utf-8')
        write_public_pages(root,[])
        self.assertTrue((root/'topics/manual.html').exists())

    def test_country_code_is_validated(self):
        from tools.seo import country_path
        with self.assertRaises(ValueError):country_path('../x')


if __name__=='__main__':unittest.main()
