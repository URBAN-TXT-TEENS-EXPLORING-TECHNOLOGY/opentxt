import { AuthForm } from "@/components/auth-form"
import { useAuth } from "@/lib/auth"

export default function SignIn() {
  const { signIn } = useAuth()
  return (
    <AuthForm
      title="opentxt"
      subtitle="Sign in to continue."
      actionLabel="Sign in"
      onSubmit={signIn}
      footerText="No account?"
      footerLinkLabel="Sign up"
      footerHref="/sign-up"
    />
  )
}
