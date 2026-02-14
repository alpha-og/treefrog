package validation

import "testing"

func TestValidateUUID(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"550e8400-e29b-41d4-a716-446655440000", true},
		{"550E8400-E29B-41D4-A716-446655440000", true},
		{"invalid-uuid", false},
		{"", false},
		{"550e8400-e29b-41d4-a716", false},
	}

	for _, test := range tests {
		result := ValidateUUID(test.input)
		if result != test.expected {
			t.Errorf("ValidateUUID(%q) = %v, expected %v", test.input, result, test.expected)
		}
	}
}
