package security

import "testing"

func TestHasPathTraversal(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"normal.txt", false},
		{"../escape.txt", true},
		{"..%2fescape.txt", true},
		{"..%2Fescape.txt", true},
		{"subdir/file.txt", true},
		{".\\escape.txt", true},
		{"%2e%2e/escape.txt", true},
		{"file\x00.txt", true},
	}

	for _, test := range tests {
		result := HasPathTraversal(test.input)
		if result != test.expected {
			t.Errorf("HasPathTraversal(%q) = %v, expected %v", test.input, result, test.expected)
		}
	}
}
