import { describe, expect, it } from 'vitest'
import { bnTerm, evidenceMessage } from './banglaText'

const message = text => evidenceMessage({ message: text })
describe('Bengali evidence descriptions', () => {
  it('translates the registration area mismatch shown in alerts', () => {
    expect(message('Registered area 9.44 differs from transaction area 7.06 decimal.'))
      .toBe('রেজিস্ট্রেশনের নথিতে জমির পরিমাণ ৯.৪৪ শতক, কিন্তু লেনদেনের নথিতে ৭.০৬ শতক।')
  })
  it('translates multiple mutation issues without transliterating the English sentence', () => {
    const result = message('Mutation owner Imran Alam (o-008811) differs from registered buyer Karim Biswas (o-000239); mutation share 20% differs from transferred share 100%; mutation date 05 Jan 2020 is earlier than the registration/transaction date.')
    expect(result).toContain('নামজারির নথিতে উল্লেখিত মালিক ইমরান আলম (o-008811)')
    expect(result).toContain('নামজারির নথিতে মালিকানার অংশ ২০%, কিন্তু হস্তান্তরিত অংশ ১০০%।')
    expect(result).toContain('রেজিস্ট্রেশন বা লেনদেনের তারিখের আগে।')
    expect(result).not.toMatch(/differs|ম্যুট|ট্রান্স|ডিফ/i)
  })
  it.each([
    ['No mutation record is linked to this transaction.', 'এই লেনদেনের সঙ্গে কোনো নামজারির নথি সংযুক্ত নেই।'],
    ['No registration record is linked to this transaction.', 'এই লেনদেনের সঙ্গে কোনো রেজিস্ট্রেশন নথি সংযুক্ত নেই।'],
    ['Mutation share 100% differs from transferred share 10%.', 'নামজারির নথিতে মালিকানার অংশ ১০০%, কিন্তু হস্তান্তরিত অংশ ১০%।'],
    ["Registration type 'Gift' differs from transaction type 'Sale'.", 'রেজিস্ট্রেশনে হস্তান্তরের ধরন দান, কিন্তু লেনদেনের নথিতে বিক্রয়।'],
    ['Mutated area 8 differs from registered area 10 decimal.', 'নামজারির নথিতে জমির পরিমাণ ৮ শতক, কিন্তু রেজিস্ট্রেশনের নথিতে ১০ শতক।'],
  ])('translates %s', (source, expected) => expect(message(source)).toBe(expected))
  it('keeps owner names and identifiers in ownership-chain messages', () => {
    const result = message('The recorded seller Karim Biswas (O-000239) does not match the recorded previous owner Imran Alam (O-001858).')
    expect(result).toContain('করিম বিশ্বাস (O-000239)')
    expect(result).toContain('ইমরান আলম (O-001858)')
    expect(result).toContain('মেলে না।')
  })
  it('explains chronological order and translates compound issue labels', () => {
    expect(message('Expected order is transaction date ≤ registration date ≤ mutation date, but the recorded dates are out of order.')).toContain('নথিভুক্ত তারিখগুলো এই ক্রম অনুসরণ করছে না।')
    expect(bnTerm('new owner mismatch, share mismatch, invalid mutation date')).toBe('নতুন মালিকের তথ্যে অমিল, মালিকানার অংশে অমিল, নামজারির তারিখে অসংগতি')
  })
})
