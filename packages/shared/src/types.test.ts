import { describe, it, expect, vi, expectTypeOf } from 'vitest';
import type {
  Walk,
  Deal,
  Business,
  Voucher,
  Profile,
  DealWithBusiness,
  VoucherStatus,
} from './types';

describe('Walk', () => {
  it('has required fields with correct types', () => {
    expectTypeOf<Walk>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<Walk>().toHaveProperty('user_id').toEqualTypeOf<string>();
    expectTypeOf<Walk>().toHaveProperty('walked_at').toEqualTypeOf<string>();
    expectTypeOf<Walk>().toHaveProperty('steps').toEqualTypeOf<number | null>();
    expectTypeOf<Walk>()
      .toHaveProperty('distance_meters')
      .toEqualTypeOf<number>();
    expectTypeOf<Walk>().toHaveProperty('points_earned').toEqualTypeOf<number>();
    expectTypeOf<Walk>().toHaveProperty('note').toEqualTypeOf<string | null>();
    expectTypeOf<Walk>()
      .toHaveProperty('source')
      .toEqualTypeOf<'manual' | 'auto'>();
    expectTypeOf<Walk>().toHaveProperty('created_at').toEqualTypeOf<string>();
    expectTypeOf<Walk>().toHaveProperty('updated_at').toEqualTypeOf<string>();
  });
});

describe('Deal', () => {
  it('has required fields with correct types', () => {
    expectTypeOf<Deal>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<Deal>().toHaveProperty('business_id').toEqualTypeOf<string>();
    expectTypeOf<Deal>().toHaveProperty('title').toEqualTypeOf<string>();
    expectTypeOf<Deal>()
      .toHaveProperty('description')
      .toEqualTypeOf<string | null>();
    expectTypeOf<Deal>().toHaveProperty('points_cost').toEqualTypeOf<number>();
    expectTypeOf<Deal>()
      .toHaveProperty('original_price')
      .toEqualTypeOf<number | null>();
    expectTypeOf<Deal>()
      .toHaveProperty('discount_percent')
      .toEqualTypeOf<number | null>();
    expectTypeOf<Deal>().toHaveProperty('is_active').toEqualTypeOf<boolean>();
    expectTypeOf<Deal>()
      .toHaveProperty('is_premium_only')
      .toEqualTypeOf<boolean>();
    expectTypeOf<Deal>().toHaveProperty('created_at').toEqualTypeOf<string>();
  });
});

describe('Business', () => {
  it('has required fields with correct types', () => {
    expectTypeOf<Business>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<Business>().toHaveProperty('owner_id').toEqualTypeOf<string>();
    expectTypeOf<Business>().toHaveProperty('name').toEqualTypeOf<string>();
    expectTypeOf<Business>()
      .toHaveProperty('description')
      .toEqualTypeOf<string | null>();
    expectTypeOf<Business>()
      .toHaveProperty('address')
      .toEqualTypeOf<string | null>();
    expectTypeOf<Business>()
      .toHaveProperty('category')
      .toEqualTypeOf<'food' | 'drinks' | 'retail' | 'other'>();
    expectTypeOf<Business>()
      .toHaveProperty('logo_url')
      .toEqualTypeOf<string | null>();
    expectTypeOf<Business>().toHaveProperty('is_active').toEqualTypeOf<boolean>();
    expectTypeOf<Business>().toHaveProperty('created_at').toEqualTypeOf<string>();
  });
});

describe('DealWithBusiness', () => {
  it('extends Deal with business fields', () => {
    expectTypeOf<DealWithBusiness>().toMatchTypeOf<Deal>();
    expectTypeOf<DealWithBusiness>()
      .toHaveProperty('business_name')
      .toEqualTypeOf<string>();
    expectTypeOf<DealWithBusiness>()
      .toHaveProperty('business_category')
      .toEqualTypeOf<'food' | 'drinks' | 'retail' | 'other'>();
    expectTypeOf<DealWithBusiness>()
      .toHaveProperty('business_address')
      .toEqualTypeOf<string | null>();
    expectTypeOf<DealWithBusiness>()
      .toHaveProperty('business_logo_url')
      .toEqualTypeOf<string | null>();
    expectTypeOf<DealWithBusiness>()
      .toHaveProperty('distance_meters')
      .toEqualTypeOf<number | undefined>();
  });
});

describe('Voucher', () => {
  it('has status as correct union type', () => {
    expectTypeOf<Voucher>().toHaveProperty('status').toEqualTypeOf<VoucherStatus>();
    expectTypeOf<VoucherStatus>().toEqualTypeOf<'active' | 'used' | 'expired'>();
  });
});

describe('Profile', () => {
  it('has required fields with correct types', () => {
    expectTypeOf<Profile>().toHaveProperty('id').toEqualTypeOf<string>();
    expectTypeOf<Profile>()
      .toHaveProperty('display_name')
      .toEqualTypeOf<string | null>();
    expectTypeOf<Profile>()
      .toHaveProperty('avatar_url')
      .toEqualTypeOf<string | null>();
    expectTypeOf<Profile>().toHaveProperty('created_at').toEqualTypeOf<string>();
    expectTypeOf<Profile>().toHaveProperty('updated_at').toEqualTypeOf<string>();
  });
});
