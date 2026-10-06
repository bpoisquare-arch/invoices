import { prisma } from '@/lib/prisma'

export async function ensureSeedData() {
  try {
    // 1. EdLink Pakistan
    let comp1 = await prisma.company.findFirst({
      where: { OR: [{ prefix: 'EDL' }, { name: 'EdLink Pakistan' }] },
    })
    if (!comp1) {
      comp1 = await prisma.company.create({
        data: {
          name: 'EdLink Pakistan',
          prefix: 'EDL',
          currency: 'AUD',
          logoUrl: '/edlink-logo.png',
        },
      })
    }
    if (comp1) {
      const t1 = await prisma.template.findFirst({ where: { companyId: comp1.id } })
      if (!t1) {
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
    }

    // 2. EdLink Australia
    let comp2 = await prisma.company.findFirst({
      where: { AND: [{ prefix: 'EDA' }, { name: 'EdLink Australia' }] },
    })
    if (!comp2) {
      comp2 = await prisma.company.create({
        data: {
          name: 'EdLink Australia',
          prefix: 'EDA',
          currency: 'AUD',
          logoUrl: '/edlink-logo.png',
        },
      })
    }
    if (comp2) {
      const t2 = await prisma.template.findFirst({ where: { companyId: comp2.id } })
      if (!t2) {
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
    }

    // 3. iSquare BPO
    let comp3 = await prisma.company.findFirst({
      where: { OR: [{ prefix: 'ISQ' }, { name: { contains: 'ISquare' } }] },
    })
    if (!comp3) {
      comp3 = await prisma.company.create({
        data: {
          name: 'ISquare BPO',
          prefix: 'ISQ',
          currency: 'USD',
          logoUrl: '/isquarebpo.png',
        },
      })
    }
    if (comp3) {
      const t3 = await prisma.template.findFirst({ where: { companyId: comp3.id } })
      if (!t3) {
        await prisma.template.create({
          data: {
            companyId: comp3.id,
            name: 'ISquare BPO Standard Template',
            companyName: 'ISquare BPO',
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
    }

    // 4. Neighbourhood Shine Co.
    let comp4 = await prisma.company.findFirst({
      where: { OR: [{ prefix: 'NSC' }, { name: { contains: 'Neighbourhood' } }] },
    })
    if (!comp4) {
      comp4 = await prisma.company.create({
        data: {
          name: 'Neighbourhood Shine Co.',
          prefix: 'NSC',
          currency: 'AUD',
          logoUrl: '/Neighbourhood-Shine.png',
        },
      })
    }
    if (comp4) {
      const t4 = await prisma.template.findFirst({ where: { companyId: comp4.id } })
      if (!t4) {
        await prisma.template.create({
          data: {
            companyId: comp4.id,
            name: 'Neighbourhood Shine Co. Standard Template',
            companyName: 'Neighbourhood Shine Co.',
            address: '22 Cheviot Avenue Berwick',
            email: '',
            phone: '',
            paymentDetails: 'BANK ACCOUNT DETAILS\nBank Name: Common Wealth Bank\nAccount Name: Neighbourhood Shine Co\nAccount Number: 313369861\nBSB / IFSC: 083-004\n\nPAY ID DETAILS\nAccount Name: Neighbourhood Shine Co\nPAY ID: 0421 953 400',
            bankDetails: 'Common Wealth Bank (BSB: 083-004, Acc: 313369861, PAY ID: 0421 953 400)',
            currency: 'AUD',
            footerTerms: '• Payment is required on arrival on the day of service.\n• The customer is responsible for arranging suitable parking for our service vehicle.\n• Access to electricity and running hot water must be available at the property.\n• While we make every effort, complete removal of pet hair cannot be guaranteed.\n• The property must be vacant at the time of cleaning.\n• Quoted pricing is based on properties in standard/normal condition. Heavily soiled properties may incur additional charges.\n• Ceilings and garage walls are excluded from the service.\n• Payment can be made via cash, bank transfer, or Pay ID.',
            primaryColor: '#8CB34E',
            layoutType: 'nsc_v1',
          },
        })
      }
    }

    return { success: true, message: 'All companies and templates ensured successfully.' }
  } catch (err: any) {
    console.error('Seed error:', err)
    return { success: false, error: err.message }
  }
}
