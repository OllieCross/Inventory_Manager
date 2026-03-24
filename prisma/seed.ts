import { PrismaClient, Role, DocType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sfxproone.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@sfxproone.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })
  console.log('Seeded admin:', admin.email)

  // Seed a viewer account for testing
  const viewerPassword = await bcrypt.hash('viewer123', 12)
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@sfxproone.com' },
    update: {},
    create: {
      name: 'Viewer',
      email: 'viewer@sfxproone.com',
      password: viewerPassword,
      role: Role.VIEWER,
    },
  })
  console.log('Seeded viewer:', viewer.email)

  // Seed a sample audio flight case
  const audioCase = await prisma.case.upsert({
    where: { qrdata: 'SAMPLE-AUDIO-001' },
    update: {},
    create: {
      name: 'Main PA Case',
      description: 'Main PA system flight case - rack with amplifiers and DSP',
      qrdata: 'SAMPLE-AUDIO-001',
      createdById: admin.id,
      items: {
        create: [
          { name: 'Crown XTi 6002 Amplifier', quantity: 2, sortOrder: 0 },
          { name: 'dbx DriveRack PA2 DSP', quantity: 1, sortOrder: 1 },
          { name: 'Furman M-8Dx Power Conditioner', quantity: 1, sortOrder: 2 },
          { name: 'XLR Cable 10m', quantity: 4, sortOrder: 3 },
          { name: 'Speakon NL4 Cable 15m', quantity: 4, sortOrder: 4 },
          { name: 'IEC Power Cable 3m', quantity: 2, sortOrder: 5 },
        ],
      },
    },
  })
  console.log('Seeded case:', audioCase.name)

  // Seed a machine-only case (no gear list, only documents - matches the spec use case)
  const machineCase = await prisma.case.upsert({
    where: { qrdata: 'SAMPLE-MACHINE-001' },
    update: {},
    create: {
      name: 'Hazer Machine HZ-500',
      description: 'Fluid hazer - no gear list, see manual and safety certificate',
      qrdata: 'SAMPLE-MACHINE-001',
      createdById: admin.id,
    },
  })
  console.log('Seeded machine case:', machineCase.name)

  // Seed a legacy Google Keep QR code case
  const legacyCase = await prisma.case.upsert({
    where: { qrdata: 'https://keep.google.com/u/0/#NOTE/legacy123456' },
    update: {},
    create: {
      name: 'Legacy Mic Case (Keep)',
      description: 'Migrated from Google Keep sticker',
      qrdata: 'https://keep.google.com/u/0/#NOTE/legacy123456',
      createdById: admin.id,
      items: {
        create: [
          { name: 'Shure SM58', quantity: 4, sortOrder: 0 },
          { name: 'Shure Beta 91A', quantity: 1, sortOrder: 1 },
          { name: 'Mic Stand Tall', quantity: 4, sortOrder: 2 },
          { name: 'XLR Cable 5m', quantity: 6, sortOrder: 3 },
        ],
      },
    },
  })
  console.log('Seeded legacy case:', legacyCase.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
