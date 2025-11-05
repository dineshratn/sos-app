package handlers

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsValidMacAddress(t *testing.T) {
	tests := []struct {
		name     string
		mac      string
		expected bool
	}{
		{
			name:     "Valid MAC with colons",
			mac:      "00:1A:2B:3C:4D:5E",
			expected: true,
		},
		{
			name:     "Valid MAC with dashes",
			mac:      "00-1A-2B-3C-4D-5E",
			expected: true,
		},
		{
			name:     "Valid MAC with dots",
			mac:      "001A.2B3C.4D5E",
			expected: true,
		},
		{
			name:     "Valid MAC lowercase",
			mac:      "00:1a:2b:3c:4d:5e",
			expected: true,
		},
		{
			name:     "Invalid MAC - too short",
			mac:      "00:1A:2B:3C:4D",
			expected: false,
		},
		{
			name:     "Invalid MAC - invalid chars",
			mac:      "00:1A:2B:3C:4D:ZZ",
			expected: false,
		},
		{
			name:     "Invalid MAC - wrong format",
			mac:      "invalid-mac",
			expected: false,
		},
		{
			name:     "Empty string",
			mac:      "",
			expected: false,
		},
		{
			name:     "Invalid MAC - too long",
			mac:      "00:1A:2B:3C:4D:5E:6F",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidMacAddress(tt.mac)
			assert.Equal(t, tt.expected, result)
		})
	}
}
