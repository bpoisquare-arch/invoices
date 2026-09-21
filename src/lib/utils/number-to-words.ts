/**
 * Converts a numeric amount to English words (e.g. 150.50 -> "One Hundred Fifty Dollars and Fifty Cents Only")
 */
export function numberToWords(amount: number, currency: string = 'AUD'): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Dollars Only'
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]

  function convertGroup(num: number): string {
    let str = ''
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + ' '
      num %= 10
    }
    if (num > 0) {
      str += ones[num] + ' '
    }
    return str.trim()
  }

  const rounded = Math.round(Math.abs(amount) * 100) / 100
  const dollars = Math.floor(rounded)
  const cents = Math.round((rounded - dollars) * 100)

  let words = ''
  if (dollars === 0) {
    words = 'Zero'
  } else {
    const billions = Math.floor(dollars / 1_000_000_000)
    const millions = Math.floor((dollars % 1_000_000_000) / 1_000_000)
    const thousands = Math.floor((dollars % 1_000_000) / 1_000)
    const remainder = dollars % 1_000

    if (billions > 0) words += convertGroup(billions) + ' Billion '
    if (millions > 0) words += convertGroup(millions) + ' Million '
    if (thousands > 0) words += convertGroup(thousands) + ' Thousand '
    if (remainder > 0) words += convertGroup(remainder) + ' '
  }

  const unitName = currency.toUpperCase() === 'USD' ? 'Dollars' : 'Dollars'
  const singularUnit = currency.toUpperCase() === 'USD' ? 'Dollar' : 'Dollar'
  words = words.trim() + (dollars === 1 ? ` ${singularUnit}` : ` ${unitName}`)

  if (cents > 0) {
    words += ' and ' + convertGroup(cents) + (cents === 1 ? ' Cent' : ' Cents')
  }

  return words.trim() + ' Only'
}
