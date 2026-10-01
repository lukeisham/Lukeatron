"""The deadline wrapper. Mirrors: criteria/transport.py (send_request itself is the one real network seam)."""

import unittest
import urllib.request

import helpers  # noqa: F401
from criteria.transport import TransportError, with_deadline


class TestDeadline(unittest.TestCase):
    def test_requests_go_through_until_the_time_is_up_then_are_refused(self):
        now = [0.0]
        sent = []
        send = with_deadline(lambda request: sent.append(request) or b"ok", 10, clock=lambda: now[0])
        request = urllib.request.Request("https://example.test/")
        self.assertEqual(send(request), b"ok")
        now[0] = 10.0
        self.assertEqual(send(request), b"ok")
        now[0] = 10.1
        with self.assertRaises(TransportError):
            send(request)
        self.assertEqual(len(sent), 2)


if __name__ == "__main__":
    unittest.main()
