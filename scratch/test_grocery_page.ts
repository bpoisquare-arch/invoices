import fs from 'fs'

const filePath = 'D:\\\\Grocery Management\\\\src\\\\app\\\\attendance\\\\records\\\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')
console.log('File length:', content.length)
console.log('Has renderCellContent:', content.includes('renderCellContent'))
console.log('Has Dialog:', content.includes('Dialog'))
