package auth

import (
	"github.com/alpha-og/treefrog/packages/go/signer"
)

type SignedURLSigner = signer.SignedURLSigner
type SignedURLData = signer.SignedURLData

func NewSignedURLSigner() (*SignedURLSigner, error) {
	return signer.NewSignedURLSigner()
}
