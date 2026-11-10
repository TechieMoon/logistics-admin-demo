-- 퀵스타 물류 어드민 데모 스키마
-- Supabase SQL Editor에 그대로 붙여 넣거나 `npm run db:setup`으로 실행합니다.
-- 여러 번 실행해도 안전하도록 if not exists를 사용합니다.

create table if not exists shipments (
  id            bigint generated always as identity primary key,
  order_no      text not null unique,
  customer_name text not null,
  phone         text not null,              -- 숫자만 저장 (01012345678)
  item_name     text not null,
  quantity      integer not null check (quantity > 0),
  tracking_cn   text,                       -- 중국 내 택배 송장번호 (선택)
  status        text not null default 'pending'
                check (status in ('pending','received','shipped','customs','domestic','delivered')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists shipments_status_idx on shipments (status);

create table if not exists status_history (
  id           bigint generated always as identity primary key,
  shipment_id  bigint not null references shipments(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  changed_by   text not null,
  changed_at   timestamptz not null default now()
);

create index if not exists status_history_shipment_idx on status_history (shipment_id, changed_at);

create table if not exists notifications (
  id           bigint generated always as identity primary key,
  shipment_id  bigint not null references shipments(id) on delete cascade,
  message      text not null,
  result       text not null check (result in ('sent','failed','skipped')),
  detail       text,
  created_at   timestamptz not null default now()
);

create table if not exists import_batches (
  id          bigint generated always as identity primary key,
  file_name   text not null,
  total_rows  integer not null,
  inserted    integer not null,
  skipped     integer not null,
  created_by  text not null,
  created_at  timestamptz not null default now()
);

-- Supabase는 anon 키로 REST API를 열어 둡니다. 정책 없이 RLS만 켜 두면
-- 브라우저에서 anon 키로 테이블을 읽거나 쓸 수 없고, 서버(DB 연결 문자열)만 접근합니다.
alter table shipments      enable row level security;
alter table status_history enable row level security;
alter table notifications  enable row level security;
alter table import_batches enable row level security;
