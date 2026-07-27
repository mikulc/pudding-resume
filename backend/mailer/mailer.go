package mailer

import "context"

type Mailer interface {
	SendRegistrationCode(ctx context.Context, to, code string) error
}
