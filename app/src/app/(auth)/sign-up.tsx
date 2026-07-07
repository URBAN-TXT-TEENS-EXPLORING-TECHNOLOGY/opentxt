import { AuthForm } from "@/components/auth-form"
import { useAuth } from "@/lib/auth"

export default function SignUp() {
  const { signUp } = useAuth()
  return (
    <AuthForm
      title="Create account"
      subtitle="A minute from now you'll be chatting."
      actionLabel="Sign up"
      onSubmit={signUp}
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerHref="/sign-in"
    />
  )
}
