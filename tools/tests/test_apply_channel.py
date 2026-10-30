import copy
import unittest

from tools.changelog import summarize
from tools.build import details_entry, index_entry
from tools.schema import APPLY_CHANNEL_TYPES
from tools.validate import validate_program
from tools.tests.test_validate import good_program, SNAPSHOT


URL = 'https://example.edu/apply'
TEXT = SNAPSHOT + ' Apply through the university portal. ' + URL


def channel():
    return {'routes': [{
        'type': 'university', 'name': 'Портал вуза', 'url': URL, 'note': '',
        'evidence': 'Apply through the university portal.',
        'source': {'url': 'https://example.edu/instructions', 'lastVerified': '2026-10-28',
                   'contentHash': 'sha256:' + 'a' * 64},
    }]}


class TestApplyChannel(unittest.TestCase):
    def test_absence_does_not_invent_a_channel(self):
        program = good_program()
        self.assertEqual(validate_program(program, SNAPSHOT), [])
        program['applyChannel'] = None
        self.assertEqual(validate_program(program, SNAPSHOT), [])

    def test_each_type_and_literal_http_links_are_supported(self):
        for kind in APPLY_CHANNEL_TYPES:
            with self.subTest(kind=kind):
                program = good_program()
                program['applyChannel'] = channel()
                program['applyChannel']['routes'][0]['type'] = kind
                self.assertEqual(validate_program(program, TEXT), [])
        program['applyChannel']['routes'][0]['url'] = 'http://example.edu/apply'
        self.assertEqual(validate_program(program, TEXT + ' http://example.edu/apply'), [])

    def test_offline_nomination_requires_an_explanation(self):
        program = good_program()
        program['applyChannel'] = channel()
        route = program['applyChannel']['routes'][0]
        route.update(type='school', url=None, note='Сначала номинация школой.')
        self.assertEqual(validate_program(program, TEXT), [])
        route['note'] = ''
        self.assertTrue(any('.note' in error for error in validate_program(program, TEXT)))

    def test_malformed_or_unsupported_values_are_rejected(self):
        mutations = [
            lambda c: c.update(routes=[]),
            lambda c: c.update(routes='portal'),
            lambda c: c['routes'][0].update(type='guessed'),
            lambda c: c['routes'][0].update(name=''),
            lambda c: c['routes'][0].update(name='Bad\ufffdname'),
            lambda c: c['routes'][0].update(url='javascript:alert(1)'),
            lambda c: c['routes'][0].update(url='https://user:secret@example.edu/'),
            lambda c: c['routes'][0].update(url='https://invented.edu/'),
            lambda c: c['routes'][0].update(evidence='An invented quotation'),
            lambda c: c['routes'][0].update(evidence='Apply\ufffd'),
            lambda c: c['routes'][0]['source'].update(lastVerified='2026-02-30'),
            lambda c: c['routes'][0]['source'].update(url='http://example.edu/'),
            lambda c: c['routes'][0]['source'].update(contentHash='sha256:wrong'),
            lambda c: c['routes'].append(copy.deepcopy(c['routes'][0])),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutations.index(mutate)):
                program = good_program()
                program['applyChannel'] = channel()
                mutate(program['applyChannel'])
                self.assertTrue(validate_program(program, TEXT))

    def test_changelog_tracks_visible_routes_but_not_proof_refresh(self):
        before = good_program()
        after = copy.deepcopy(before)
        after['applyChannel'] = channel()
        self.assertEqual(summarize(before, after), ['канал подачи'])
        refreshed = copy.deepcopy(after)
        refreshed['applyChannel']['routes'][0]['source']['lastVerified'] = '2026-10-29'
        self.assertEqual(summarize(after, refreshed), [])

    def test_site_details_keep_multiple_routes_and_provenance_without_proof_bulk(self):
        program = good_program()
        self.assertNotIn('applyChannel', details_entry(program))
        program['applyChannel'] = channel()
        route = copy.deepcopy(program['applyChannel']['routes'][0])
        route.update(type='agent', name='Авторизованный агент', url=None, note='Допустимая альтернатива.')
        program['applyChannel']['routes'].append(route)
        output = details_entry(program)['applyChannel']['routes']
        self.assertEqual([r['type'] for r in output], ['university', 'agent'])
        self.assertEqual(output[1]['note'], 'Допустимая альтернатива.')
        self.assertEqual(output[0]['source'], {'url': 'https://example.edu/instructions', 'lastVerified': '2026-10-28'})
        self.assertNotIn('evidence', output[0])
        self.assertNotIn('applyChannel', index_entry(program))
