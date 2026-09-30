import { prisma } from '@/lib/prisma'

export async function ensureSeedData() {
  try {
    const existingCompanies = await prisma.company.findMany({
      select: { id: true, name: true },
    })

    if (existingCompanies && existingCompanies.length > 0) {
      return { success: true, message: 'Existing companies loaded.', count: existingCompanies.length }
    }

    // 1. EdLink Pakistan
    const comp1 = await prisma.company.create({
      data: {
        name: 'EdLink Pakistan',
        prefix: 'EDL',
        currency: 'AUD',
      },
    })

    if (comp1) {
      await prisma.template.create({
        data: {
          companyId: comp1.id,
          name: 'EdLink Pakistan Standard Template',
          companyName: 'EdLink Pakistan',
          address: 'Suit 3, Level 4/20 Collins Street, Melbourne 3000',
          email: 'finance@edlink.com.au',
          phone: '+61 432 536 123',
          paymentDetails: 'Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469',
          bankDetails: 'Riaz & Sons PTY Ltd (BSB: 083-543, Account: 72-996-1834)',
          currency: 'AUD',
          footerTerms: 'Thank you for getting services from us',
          primaryColor: '#2563eb',
          layoutType: 'edlink_v1',
        },
      })
    }

    // 2. EdLink Australia
    const comp2 = await prisma.company.create({
      data: {
        name: 'EdLink Australia',
        prefix: 'EDA',
        currency: 'AUD',
      },
    })

    if (comp2) {
      await prisma.template.create({
        data: {
          companyId: comp2.id,
          name: 'EdLink Australia Standard Template',
          companyName: 'EdLink Australia',
          address: 'Level 1, 100 Collins Street, Melbourne VIC 3000',
          email: 'australia@edlink.com.au',
          phone: '+61 3 9000 1234',
          paymentDetails: 'Account Name: EdLink Australia PTY Ltd\nBSB: 063-000\nAccount No: 1234 5678',
          bankDetails: 'EdLink Australia PTY Ltd',
          currency: 'AUD',
          footerTerms: 'Thank you for choosing EdLink Australia.',
          primaryColor: '#0284c7',
          layoutType: 'default_v1',
        },
      })
    }

    // 3. iSquare BPO
    const comp3 = await prisma.company.create({
      data: {
        name: 'iSquare BPO',
        prefix: 'ISQ',
        currency: 'USD',
      },
    })

    if (comp3) {
      await prisma.template.create({
        data: {
          companyId: comp3.id,
          name: 'iSquare BPO Standard Template',
          companyName: 'iSquare BPO',
          address: 'Suite 500, Tech Park, Islamabad, Pakistan',
          email: 'invoicing@isquarebpo.com',
          phone: '+92 51 111 222 333',
          paymentDetails: 'Account Name: iSquare BPO Solutions\nSWIFT: ISQBPOPK\nAccount No: 9876543210',
          bankDetails: 'iSquare BPO Solutions',
          currency: 'USD',
          footerTerms: 'Payment due within 15 days of invoice date.',
          primaryColor: '#7c3aed',
          layoutType: 'default_v1',
        },
      })
    }

    return { success: true, message: 'Initial companies and templates seeded successfully.' }
  } catch (err: any) {
    console.error('Seed error:', err)
    return { success: false, error: err.message }
  }
}
