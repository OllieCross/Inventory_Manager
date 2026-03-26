import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import type { Provider } from 'next-auth/providers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'

const providers: Provider[] = [
  Credentials({
    name: 'Email & Password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const { allowed } = await checkRateLimit(`login:${credentials.email as string}`)
      if (!allowed) throw new Error('Too many login attempts. Please wait 60 seconds and try again.')

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      })

      if (!user || !user.password) return null

      const valid = await bcrypt.compare(credentials.password as string, user.password)
      if (!valid) return null

      return { id: user.id, name: user.name, email: user.email, role: user.role }
    },
  }),
]

// Only add Authentik OIDC provider when credentials are configured
if (
  process.env.AUTHENTIK_CLIENT_ID &&
  process.env.AUTHENTIK_CLIENT_SECRET &&
  process.env.AUTHENTIK_ISSUER
) {
  const { default: Authentik } = await import('next-auth/providers/authentik')
  providers.push(
    Authentik({
      clientId: process.env.AUTHENTIK_CLIENT_ID,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET,
      issuer: process.env.AUTHENTIK_ISSUER,
    })
  )
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
