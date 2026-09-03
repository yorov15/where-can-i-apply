import unittest

from tools.check import days_until, frequency_for, is_due


def deadline(closes):
    return {"opens": None, "closes": closes, "recurring": "annual", "confidence": "confirmed"}


class TestDaysUntil(unittest.TestCase):
    def test_counts_days(self):
        self.assertEqual(days_until("2026-09-13", "2026-09-03"), 10)

    def test_past_deadline_is_negative(self):
        self.assertEqual(days_until("2026-09-01", "2026-09-03"), -2)

    def test_missing_date_is_none(self):
        self.assertIsNone(days_until(None, "2026-09-03"))


class TestFrequency(unittest.TestCase):
    def test_close_deadline_checked_daily(self):
        self.assertEqual(frequency_for(deadline("2026-09-20"), "2026-09-03"), "daily")

    def test_medium_deadline_checked_weekly(self):
        self.assertEqual(frequency_for(deadline("2026-10-20"), "2026-09-03"), "weekly")

    def test_far_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline("2027-06-01"), "2026-09-03"), "monthly")

    def test_unknown_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline(None), "2026-09-03"), "monthly")

    def test_passed_deadline_checked_monthly(self):
        self.assertEqual(frequency_for(deadline("2026-08-01"), "2026-09-03"), "monthly")

    def test_boundary_thirty_days_is_weekly(self):
        self.assertEqual(frequency_for(deadline("2026-10-03"), "2026-09-03"), "weekly")


class TestIsDue(unittest.TestCase):
    def test_never_verified_is_due(self):
        program = {"deadline": deadline("2027-06-01"), "source": {"lastVerified": None}}
        self.assertTrue(is_due(program, "2026-09-03"))

    def test_verified_today_is_not_due(self):
        program = {"deadline": deadline("2026-09-20"), "source": {"lastVerified": "2026-09-03"}}
        self.assertFalse(is_due(program, "2026-09-03"))

    def test_daily_program_is_due_next_day(self):
        program = {"deadline": deadline("2026-09-20"), "source": {"lastVerified": "2026-09-02"}}
        self.assertTrue(is_due(program, "2026-09-03"))

    def test_monthly_program_is_not_due_after_a_week(self):
        program = {"deadline": deadline("2027-06-01"), "source": {"lastVerified": "2026-08-27"}}
        self.assertFalse(is_due(program, "2026-09-03"))


if __name__ == "__main__":
    unittest.main()
