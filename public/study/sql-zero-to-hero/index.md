SQL is the most durable skill in software. Frameworks rise and die every few years, but the language you use to ask a relational database a question has been around since the 1970s. The applications change; the SQL mostly doesn't. This article takes you from "what is a table?" to window functions, isolation levels, index design and reading query plans. It's the path most working engineers pick up in pieces over several years, laid out in order.

You'll use one small online shop as the example the whole way through. Every query runs on **PostgreSQL 16 or newer**, and where MySQL, SQLite or SQL Server behave differently, you'll get a note. Type the queries in yourself instead of just reading them. SQL sticks when your fingers have written it and you've watched the result come back.

## Relational databases in one page

A relational database stores data in **tables** (formally *relations*). A table has a fixed set of named, typed **columns** and holds any number of **rows**. Each row is one fact: "customer 3 is Grace Hopper, lives in the US, signed up on 2025-03-15."

Three ideas do most of the work:

- **Keys identify rows.** A *primary key* is a column (or set of columns) whose value is unique and never NULL, so every row can be addressed. A *foreign key* is a column that points at another table's primary key, and the database refuses values that point nowhere.
- **Relationships live in data, not in pointers.** An order doesn't contain its customer. It stores `customer_id = 3`, and you *join* on that value at query time. This is why the same data can answer questions nobody thought of when the schema was designed.
- **SQL is declarative.** You describe *what* result you want. The query planner decides *how* to get it: which index to use, which join algorithm, in what order. That separation is the whole trick. The same query can go from 30 seconds to 3 milliseconds because someone added an index, and the text of the query never changes.

![Two tables, customers and orders, with the primary key customer_id in customers and the foreign key customer_id in orders pointing at it; rows, columns and a rejected orphan row are labelled](study/sql-zero-to-hero/relational-model.svg "Figure 1: Tables, rows, columns, primary keys and foreign keys. The foreign key refuses an order for customer 99, who doesn't exist.")

A relational database management system (RDBMS) also gives you **transactions** (a group of changes that happens completely or not at all), **constraints** (rules the data must obey), **concurrency control** (many users at once without corrupting anything) and **durability** (committed data survives a crash). Keep those in mind, because they're the reason to use a database at all instead of a folder of JSON files.

### Which database?

| Engine | Strengths | Typical use |
|---|---|---|
| PostgreSQL | Standards-compliant, very feature-rich (JSONB, window functions, CTEs, extensions), permissive license | Default choice for new backends |
| MySQL / MariaDB | Ubiquitous, simple to operate, huge hosting ecosystem | Web apps, especially the PHP/WordPress world |
| SQLite | A library, not a server; a whole database in one file | Mobile, desktop, embedded, tests, small sites |
| SQL Server | Deep Microsoft tooling, T-SQL | .NET and enterprise shops |
| Oracle | Enterprise features, long history | Large enterprises, banking |

Standard SQL carries over between all of them. The differences are in details like types, auto-increment syntax, string functions and upsert syntax. Learn PostgreSQL first: it sticks closest to the standard and has the fewest surprises.

## Your playground and the running example

### Getting a database for free

**Option A: Docker (recommended).** One command gives you a clean PostgreSQL server you can throw away:

```bash
docker run --name shop-pg -e POSTGRES_PASSWORD=secret -p 5432:5432 -d postgres:17
docker exec -it shop-pg psql -U postgres
```

**Option B: native install.** Use the installer from postgresql.org on Windows/macOS, `brew install postgresql@17` on macOS, or `sudo apt install postgresql` on Debian/Ubuntu. Then connect with `psql`.

**Option C: SQLite.** Nothing to run: `sqlite3 shop.db` opens (or creates) a database file. Great for learning the basics. Weaker on types and some advanced features, so you'll need to adapt a few examples.

**Option D: in the browser.** Sites such as DB Fiddle (db-fiddle.com) and dbfiddle.uk let you pick an engine and run SQL with no install. Managed Postgres providers (Neon, Supabase and others) offer free tiers too. Limits change often, so check each provider's pricing page at the time of writing (2026).

A few `psql` commands you'll use constantly:

```text
\l            list databases          \c shop       connect to database "shop"
\dt           list tables             \d orders     describe table "orders"
\x            toggle expanded output  \timing       show query duration
\?            help on meta-commands   \q            quit
```

### The shop schema

Create a database and connect to it:

```sql
CREATE DATABASE shop;
\c shop
```

Now the schema. Read it slowly. Nearly every concept in this article shows up somewhere in these five tables.

```sql
CREATE TABLE categories (
    category_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text    NOT NULL UNIQUE,
    parent_id   integer REFERENCES categories (category_id)
);

CREATE TABLE customers (
    customer_id integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       text        NOT NULL UNIQUE,
    full_name   text        NOT NULL,
    country     text,
    referred_by integer     REFERENCES customers (customer_id),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
    product_id  integer       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku         text          NOT NULL UNIQUE,
    name        text          NOT NULL,
    category_id integer       REFERENCES categories (category_id),
    price       numeric(10,2) NOT NULL CHECK (price >= 0),
    stock       integer       NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

CREATE TABLE orders (
    order_id    integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id integer     NOT NULL REFERENCES customers (customer_id),
    status      text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
    ordered_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    order_id   integer       NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    product_id integer       NOT NULL REFERENCES products (product_id),
    quantity   integer       NOT NULL CHECK (quantity > 0),
    unit_price numeric(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
```

Now the sample data. Identity columns number rows 1, 2, 3... in insert order, so on a fresh database the IDs will match the ones used in this article.

```sql
INSERT INTO categories (name, parent_id) VALUES
    ('Electronics', NULL),   -- 1
    ('Computers',   1),      -- 2
    ('Laptops',     2),      -- 3
    ('Phones',      1),      -- 4
    ('Books',       NULL),   -- 5
    ('Programming', 5),      -- 6
    ('Garden',      NULL);   -- 7

INSERT INTO customers (email, full_name, country, referred_by, created_at) VALUES
    ('ada@example.com',      'Ada Lovelace',      'UK', NULL, '2025-01-10 09:00+00'),
    ('alan@example.com',     'Alan Turing',       'UK', 1,    '2025-02-03 14:30+00'),
    ('grace@example.com',    'Grace Hopper',      'US', 1,    '2025-03-15 11:15+00'),
    ('linus@example.com',    'Linus Torvalds',    'FI', 3,    '2025-04-01 08:45+00'),
    ('margaret@example.com', 'Margaret Hamilton', NULL, NULL, '2025-05-20 16:00+00');

INSERT INTO products (sku, name, category_id, price, stock) VALUES
    ('LAP-001', 'ThinkPad X1',                           3,    1899.00,   5),
    ('LAP-002', 'MacBook Air',                           3,    1299.00,   8),
    ('PHN-001', 'Pixel 9',                               4,     799.00,  12),
    ('BK-001',  'SQL Performance Explained',             6,      39.90,  40),
    ('BK-002',  'Designing Data-Intensive Applications', 6,      45.50,  25),
    ('ACC-001', 'USB-C Cable',                           NULL,    9.99, 200);

INSERT INTO orders (customer_id, status, ordered_at) VALUES
    (1, 'paid',      '2025-06-01 10:00+00'),   -- 1
    (2, 'shipped',   '2025-06-03 12:20+00'),   -- 2
    (1, 'shipped',   '2025-06-10 18:05+00'),   -- 3
    (3, 'paid',      '2025-06-12 09:40+00'),   -- 4
    (4, 'cancelled', '2025-06-15 21:10+00'),   -- 5
    (3, 'pending',   '2025-07-01 07:55+00'),   -- 6
    (1, 'paid',      '2025-07-05 13:30+00');   -- 7

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 1, 1899.00), (1, 6, 2, 9.99),
    (2, 4, 1,   39.90), (2, 5, 1, 45.50),
    (3, 3, 1,  799.00),
    (4, 2, 1, 1299.00), (4, 4, 2, 39.90),
    (5, 3, 1,  799.00),
    (6, 5, 1,   45.50),
    (7, 6, 3,    9.99), (7, 4, 1, 39.90);
```

![Entity relationship diagram of categories, customers, products, orders and order_items with primary keys, foreign keys and one-to-many relationships, including self references on categories and customers](study/sql-zero-to-hero/erd.svg "Figure 2: The shop schema. order_items is the junction table that resolves the many-to-many relationship between orders and products.")

A few design choices are worth pointing out now, because each one comes up again later:

- `order_items.unit_price` copies the price at purchase time. Product prices change. Historical orders must not.
- `order_items` has a **composite primary key** `(order_id, product_id)`. The same product can't appear twice in one order.
- `categories.parent_id` and `customers.referred_by` are **self-references**. They make trees and chains, which is what you need for self-joins and recursive queries.
- Money is `numeric(10,2)`, never `float`. Floating point can't represent 0.10 exactly, and sums drift.

> **NOTE:** Dialect differences for auto-numbering: MySQL uses `AUTO_INCREMENT`, SQL Server uses `IDENTITY(1,1)`, SQLite uses `INTEGER PRIMARY KEY`. PostgreSQL also accepts the older `serial` type, but `GENERATED ... AS IDENTITY` is the SQL-standard form and the one to prefer.

## Reading data: SELECT, WHERE, ORDER BY and NULL

### The basic shape

```sql
SELECT name, price
FROM products
WHERE price < 100
ORDER BY price DESC
LIMIT 3;
```

```text
                 name                  | price
---------------------------------------+-------
 Designing Data-Intensive Applications | 45.50
 SQL Performance Explained             | 39.90
 USB-C Cable                           |  9.99
```

Read it as: *from* products, keep rows *where* price is under 100, *order* by price descending, return the first three. `SELECT *` returns every column. That's fine in the console and a bad habit in application code (more on that in the anti-patterns section).

### Filtering tools

```sql
-- Comparison and boolean logic
SELECT * FROM orders WHERE status = 'paid' AND ordered_at >= '2025-07-01';

-- Set membership and ranges
SELECT * FROM products WHERE category_id IN (3, 4);
SELECT * FROM products WHERE price BETWEEN 40 AND 1300;   -- inclusive on both ends

-- Pattern matching: % = any run of characters, _ = exactly one
SELECT * FROM customers WHERE email LIKE '%@example.com';
SELECT * FROM products  WHERE name ILIKE '%sql%';         -- case-insensitive (PostgreSQL only)
```

`ILIKE` is a PostgreSQL extension. In other engines, write `lower(name) LIKE '%sql%'`. In MySQL, `LIKE` is usually case-insensitive already because of the default collation.

### Computed columns, aliases and CASE

```sql
SELECT name,
       price,
       price * 1.20                         AS price_with_vat,
       CASE WHEN price >= 1000 THEN 'premium'
            WHEN price >= 100  THEN 'standard'
            ELSE 'budget'
       END                                  AS tier
FROM products
ORDER BY tier, price DESC;
```

`CASE` is SQL's if/else, and it works anywhere an expression is allowed: in `SELECT`, `WHERE`, `ORDER BY`, and inside aggregates. `DISTINCT` removes duplicate result rows: `SELECT DISTINCT country FROM customers;`.

### Limiting and paging

`LIMIT n OFFSET m` is PostgreSQL/MySQL/SQLite syntax. The standard form, which PostgreSQL also supports, is `OFFSET m ROWS FETCH FIRST n ROWS ONLY`. SQL Server uses `TOP n` or `OFFSET ... FETCH`. Always pair `LIMIT` with `ORDER BY`. Without it, "the first 10 rows" means "any 10 rows the engine happens to find first," and that can change between runs.

### NULL and three-valued logic

`NULL` means "unknown" or "not applicable". It is not zero and it is not an empty string. Any comparison with an unknown value gives **unknown**, so SQL's logic has three values: TRUE, FALSE and UNKNOWN. `WHERE` keeps only rows where the condition is TRUE.

```sql
SELECT full_name FROM customers WHERE country = NULL;    -- 0 rows! NULL = NULL is UNKNOWN
SELECT full_name FROM customers WHERE country IS NULL;   -- Margaret Hamilton
SELECT full_name FROM customers WHERE country <> 'UK';   -- Grace, Linus. Not Margaret!
```

The last one catches everyone. Margaret's country is unknown, so "is it different from UK?" is also unknown, and her row is filtered out. If you want her included, say so: `WHERE country <> 'UK' OR country IS NULL`, or use the null-safe comparison `WHERE country IS DISTINCT FROM 'UK'`.

The truth tables are small and worth memorizing:

| a | b | a AND b | a OR b |
|---|---|---|---|
| TRUE | UNKNOWN | UNKNOWN | TRUE |
| FALSE | UNKNOWN | FALSE | UNKNOWN |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

`NOT UNKNOWN` is still UNKNOWN. Useful NULL tools:

- `COALESCE(country, 'n/a')` returns the first non-NULL argument.
- `NULLIF(a, b)` returns NULL when `a = b`. The classic use is `x / NULLIF(y, 0)`, which avoids division by zero.
- Aggregates skip NULLs: `COUNT(country)` is 4, `COUNT(*)` is 5.
- `ORDER BY` puts NULLs last in ascending order in PostgreSQL (first in MySQL, SQLite and SQL Server). Make it explicit with `NULLS FIRST` / `NULLS LAST`.

> **WARNING:** The most dangerous NULL trap is `NOT IN` with a subquery. `WHERE customer_id NOT IN (SELECT referred_by FROM customers)` returns **zero rows**, because `referred_by` contains NULLs, and `x NOT IN (1, 3, NULL)` can never be TRUE. Use `NOT EXISTS` instead (covered in the subqueries section).

## Aggregation and the logical query order

### Aggregates and GROUP BY

Aggregate functions collapse many rows into one: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, plus `string_agg`, `array_agg`, `bool_and` and friends.

```sql
SELECT status, COUNT(*) AS orders
FROM orders
GROUP BY status
ORDER BY orders DESC, status;
```

```text
  status   | orders
-----------+--------
 paid      |      3
 shipped   |      2
 cancelled |      1
 pending   |      1
```

`GROUP BY` splits rows into buckets with equal values in the grouping columns, then runs the aggregates once per bucket. The rule that follows: **every column in `SELECT` must either be in `GROUP BY` or sit inside an aggregate.** Otherwise the database doesn't know which of the bucket's many values to show. PostgreSQL relaxes this in one sensible case. If you group by a table's primary key, you can select any other column of that table, because it's functionally dependent on the key.

### HAVING filters groups

`WHERE` filters rows *before* grouping. `HAVING` filters groups *after*. Revenue per customer, excluding cancelled orders, keeping only customers over 1000:

```sql
SELECT c.full_name,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM customers c
JOIN orders o       ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id   = o.order_id
WHERE o.status <> 'cancelled'            -- row filter
GROUP BY c.customer_id, c.full_name
HAVING SUM(oi.quantity * oi.unit_price) > 1000   -- group filter
ORDER BY revenue DESC;
```

```text
  full_name   | revenue
--------------+---------
 Ada Lovelace | 2787.85
 Grace Hopper | 1424.30
```

(Joins are explained properly in the next section. For now, read `JOIN ... ON` as "attach the matching rows.")

### Conditional aggregates with FILTER

PostgreSQL (and SQLite) support the standard `FILTER` clause, which makes pivot-style reports easy:

```sql
SELECT COUNT(*)                                   AS all_orders,
       COUNT(*) FILTER (WHERE status = 'paid')    AS paid,
       COUNT(*) FILTER (WHERE status = 'shipped') AS shipped
FROM orders;
```

In MySQL or SQL Server, write `SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)` instead.

### The logical processing order

This is the concept that clears up most SQL confusion. You *write* `SELECT` first, but the database *logically evaluates* the clauses in a different order:

![Pipeline of eight stages from FROM and JOIN through WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY to LIMIT, with notes on what each stage can see](study/sql-zero-to-hero/query-order.svg "Figure 3: Logical query processing order. Each stage only sees what the stages before it produced.")

1. `FROM` / `JOIN`: build the working set of rows
2. `WHERE`: discard rows
3. `GROUP BY`: form groups
4. `HAVING`: discard groups
5. `SELECT`: compute output expressions (window functions run here)
6. `DISTINCT`: remove duplicate rows
7. `ORDER BY`: sort
8. `LIMIT` / `OFFSET`: cut

The order explains a lot of "why doesn't this work?" moments:

- **You can't use a `SELECT` alias in `WHERE`.** `WHERE` runs before `SELECT` creates the alias. You *can* use it in `ORDER BY`, which runs later.
- **You can't put aggregates in `WHERE`.** Groups don't exist yet. That's what `HAVING` is for.
- **You can't filter on a window function in the same query.** It's computed in step 5, after `WHERE`. Wrap it in a subquery or CTE. (Snowflake, BigQuery and DuckDB have a `QUALIFY` clause for this. PostgreSQL doesn't.)

This is *logical* order, the semantics. The planner is free to physically do things differently, like pushing filters into scans or using an index to skip sorting, as long as the result is the same.

> **EXERCISE:** Which products have sold more than 3 units in total across non-cancelled orders? Return product name and units. (Answer: `SQL Performance Explained` with 4 and `USB-C Cable` with 5. Join `products`, `order_items` and `orders`, filter status in `WHERE`, group by product, filter the sum in `HAVING`.)

## Joins

A join combines rows from two tables whenever a condition holds. The mental model that works best isn't the Venn diagram. It's **row matching**: for each row on the left, find the rows on the right that satisfy the `ON` condition.

![Row matching illustration for INNER, LEFT, RIGHT and FULL joins between products and categories, showing matched rows, unmatched rows kept with NULLs, and rows dropped](study/sql-zero-to-hero/joins.svg "Figure 4: Join types as row matching. The join type only decides what happens to rows that find no partner.")

### INNER JOIN

Keeps only pairs that match. Products with their category:

```sql
SELECT p.name, c.name AS category
FROM products p
INNER JOIN categories c ON c.category_id = p.category_id;
```

The USB-C cable has `category_id = NULL`, which matches nothing, so it disappears. Categories with no products (Electronics, Computers, Books, Garden) also disappear. `JOIN` on its own means `INNER JOIN`.

### LEFT (OUTER) JOIN

Keeps every row from the left table. Where there's no match, the right-side columns are NULL. Orders per customer, including customers who never ordered:

```sql
SELECT c.full_name, COUNT(o.order_id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.full_name
ORDER BY orders DESC, c.full_name;
```

```text
     full_name     | orders
-------------------+--------
 Ada Lovelace      |      3
 Grace Hopper      |      2
 Alan Turing       |      1
 Linus Torvalds    |      1
 Margaret Hamilton |      0
```

Note `COUNT(o.order_id)`, not `COUNT(*)`. Margaret's row exists with NULLs on the order side, so `COUNT(*)` would report 1.

> **WARNING:** A filter on the *right* table in `WHERE` quietly turns a LEFT JOIN back into an INNER JOIN. `LEFT JOIN orders o ON ... WHERE o.status = 'paid'` drops Margaret, because `NULL = 'paid'` is UNKNOWN. Put the condition in the `ON` clause instead: `LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'paid'`.

### RIGHT and FULL OUTER JOIN

`RIGHT JOIN` is a mirror image of `LEFT JOIN`. Most people just swap the table order and always write LEFT. `FULL JOIN` keeps unmatched rows from *both* sides:

```sql
SELECT p.name AS product, c.name AS category
FROM products p
FULL JOIN categories c ON c.category_id = p.category_id;
```

The result has the USB-C cable with a NULL category, and Electronics, Computers, Books and Garden with a NULL product. It's handy for reconciliation jobs ("what's in system A but not B, and vice versa"). MySQL has no `FULL JOIN`, so emulate it with a `LEFT JOIN ... UNION ... RIGHT JOIN`. SQLite added RIGHT and FULL joins in version 3.39.

### CROSS JOIN

Every row paired with every row, a Cartesian product. 5 customers times 6 products gives 30 rows. Useful for generating combinations, like a report grid of every customer by every category, which you then LEFT JOIN actual data onto. If you ever see a query return millions of rows unexpectedly, look for a missing join condition. That's an accidental cross join.

### Self join

A table joined to itself, with two different aliases. Who referred whom:

```sql
SELECT c.full_name AS customer, r.full_name AS referred_by
FROM customers c
JOIN customers r ON r.customer_id = c.referred_by;
```

```text
    customer    | referred_by
----------------+--------------
 Alan Turing    | Ada Lovelace
 Grace Hopper   | Ada Lovelace
 Linus Torvalds | Grace Hopper
```

### Join gotchas

- **Fan-out.** Joining orders to order_items produces one row *per item*. If you then `SUM` a column from orders, like a shipping fee, you count it once per item. Aggregate the child table in a subquery first, then join.
- **`USING (col)`** is shorthand when both sides share a column name: `JOIN orders USING (customer_id)`. `NATURAL JOIN` joins on *all* same-named columns and breaks silently when someone adds a column. Avoid it.
- **Anti-joins and semi-joins** ("customers with no orders" / "customers with at least one order") are best written with `NOT EXISTS` / `EXISTS`. That's up next.

## Subqueries, CTEs and set operations

### Scalar and table subqueries

A subquery is a query inside a query. It can return a single value, a list, or a whole table:

```sql
-- Scalar: compare to a single computed value
SELECT name, price FROM products
WHERE price > (SELECT AVG(price) FROM products);

-- Derived table: a subquery in FROM must have an alias
SELECT t.order_id, t.total
FROM (
    SELECT order_id, SUM(quantity * unit_price) AS total
    FROM order_items
    GROUP BY order_id
) AS t
WHERE t.total > 1000;
```

### Correlated subqueries

A *correlated* subquery references the outer row, so logically it runs once per outer row. Products priced above their own category's average:

```sql
SELECT p.name, p.price
FROM products p
WHERE p.price > (
    SELECT AVG(p2.price)
    FROM products p2
    WHERE p2.category_id = p.category_id   -- correlation
);
```

This returns `ThinkPad X1` (the laptop average is 1599) and `Designing Data-Intensive Applications` (the programming-book average is 42.70). The planner often rewrites correlated subqueries into joins, so "runs once per row" describes the meaning, not necessarily the execution.

### EXISTS and NOT EXISTS

`EXISTS` asks "is there at least one matching row?" and stops at the first match. It's the right tool for semi-joins and anti-joins, and it handles NULLs sanely:

```sql
-- Customers who have never placed an order (anti-join)
SELECT c.full_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);
-- Margaret Hamilton

-- Customers who have never referred anyone. Correct, unlike the NOT IN version
SELECT c.full_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM customers x WHERE x.referred_by = c.customer_id
);
-- Alan Turing, Linus Torvalds, Margaret Hamilton
```

### LATERAL: a subquery per row

`JOIN LATERAL` lets a subquery in `FROM` reference earlier tables. That makes "top N per group" natural. The two most recent orders per customer:

```sql
SELECT c.full_name, r.order_id, r.ordered_at
FROM customers c
CROSS JOIN LATERAL (
    SELECT o.order_id, o.ordered_at
    FROM orders o
    WHERE o.customer_id = c.customer_id
    ORDER BY o.ordered_at DESC
    LIMIT 2
) AS r;
```

SQL Server spells this `CROSS APPLY` / `OUTER APPLY`. MySQL supports `LATERAL` from 8.0.14. Use `LEFT JOIN LATERAL (...) ON true` to keep customers with no orders.

### Common table expressions (WITH)

A CTE names a subquery so the main query reads top to bottom, like a pipeline:

```sql
WITH order_totals AS (
    SELECT o.order_id, o.customer_id, o.ordered_at,
           SUM(oi.quantity * oi.unit_price) AS total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.order_id
),
big_spenders AS (
    SELECT customer_id FROM order_totals
    GROUP BY customer_id
    HAVING SUM(total) > 1000
)
SELECT t.*
FROM order_totals t
JOIN big_spenders b USING (customer_id)
ORDER BY t.ordered_at;
```

(Grouping by `o.order_id` alone is allowed here because it's the primary key of `orders`, so the other `orders` columns are functionally dependent on it.)

Since PostgreSQL 12, simple CTEs are inlined into the main query, so they cost nothing extra. Before 12 they were always materialized, which acted as an optimization fence. You can force either behavior with `WITH x AS MATERIALIZED (...)` or `AS NOT MATERIALIZED`.

### Recursive CTEs

A recursive CTE has an **anchor** part (the starting rows) and a **recursive** part that joins back to the CTE itself. It repeats until no new rows appear. It's how you walk trees and graphs in SQL. The full path of every category:

```sql
WITH RECURSIVE tree AS (
    -- anchor: top-level categories
    SELECT category_id, name, parent_id, name AS path, 1 AS depth
    FROM categories
    WHERE parent_id IS NULL
  UNION ALL
    -- recursive step: children of rows found so far
    SELECT c.category_id, c.name, c.parent_id,
           t.path || ' > ' || c.name, t.depth + 1
    FROM categories c
    JOIN tree t ON c.parent_id = t.category_id
)
SELECT path, depth FROM tree ORDER BY path;
```

```text
               path                | depth
-----------------------------------+-------
 Books                             |     1
 Books > Programming               |     2
 Electronics                       |     1
 Electronics > Computers           |     2
 Electronics > Computers > Laptops |     3
 Electronics > Phones              |     2
 Garden                            |     1
```

If your data might contain a cycle (A's parent is B, B's parent is A), the recursion never ends. PostgreSQL 14+ has a `CYCLE` clause that detects it: add `CYCLE category_id SET is_cycle USING visited` after the CTE body. On older versions, track visited IDs in an array and stop when you see one again.

### Set operations

These combine the *results* of queries with the same number of compatible columns:

| Operator | Result |
|---|---|
| `UNION` | Rows in either result, duplicates removed |
| `UNION ALL` | Rows in either result, duplicates kept (faster, no dedup) |
| `INTERSECT` | Rows in both |
| `EXCEPT` | Rows in the first but not the second (Oracle before 21c: `MINUS`) |

Customers who ordered in both June and July 2025:

```sql
SELECT customer_id FROM orders
WHERE ordered_at >= '2025-06-01' AND ordered_at < '2025-07-01'
INTERSECT
SELECT customer_id FROM orders
WHERE ordered_at >= '2025-07-01' AND ordered_at < '2025-08-01';
-- 1 (Ada) and 3 (Grace)
```

Default to `UNION ALL` unless you actually need deduplication. `UNION` has to sort or hash the whole result to remove duplicates.

## Window functions

Window functions are where SQL goes from "query language" to "analytics engine." A window function computes a value **across a set of related rows while keeping every row**. `GROUP BY` collapses rows. Windows don't.

```sql
function_name(...) OVER (
    PARTITION BY ...   -- split rows into independent groups (optional)
    ORDER BY ...       -- order within each partition (optional)
    ROWS/RANGE/GROUPS BETWEEN ... AND ...   -- the frame (optional)
)
```

There are three main families: ranking, looking at neighboring rows, and running aggregates.

### Ranking: ROW_NUMBER, RANK, DENSE_RANK

```sql
SELECT name, category_id, price,
       ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rn,
       RANK()       OVER (ORDER BY price DESC)                          AS rnk,
       DENSE_RANK() OVER (ORDER BY price DESC)                          AS drnk
FROM products;
```

- `ROW_NUMBER` numbers rows 1, 2, 3... with no ties. Tied rows get an arbitrary order unless you add a tiebreaker.
- `RANK` gives ties the same rank and leaves gaps: 1, 2, 2, 4.
- `DENSE_RANK` gives ties the same rank with no gaps: 1, 2, 2, 3.

The classic pattern "best row per group" filters on the row number in an outer query. Remember, you can't do it in `WHERE` directly:

```sql
SELECT name, category_id, price
FROM (
    SELECT p.*, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rn
    FROM products p
) ranked
WHERE rn = 1;   -- most expensive product in each category
```

> **TIP:** PostgreSQL has a shortcut for "one row per group": `SELECT DISTINCT ON (category_id) * FROM products ORDER BY category_id, price DESC;`. It's non-standard but short and fast.

### LAG and LEAD: looking at neighbors

`LAG(x)` returns `x` from the previous row in the window order, and `LEAD(x)` from the next. Month-over-month revenue:

```sql
WITH monthly AS (
    SELECT date_trunc('month', o.ordered_at) AS month,
           SUM(oi.quantity * oi.unit_price)  AS revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY 1
)
SELECT month::date,
       revenue,
       LAG(revenue) OVER (ORDER BY month)            AS prev_month,
       revenue - LAG(revenue) OVER (ORDER BY month)  AS change
FROM monthly
ORDER BY month;
```

```text
   month    | revenue | prev_month |  change
------------+---------+------------+----------
 2025-06-01 | 4182.18 |            |
 2025-07-01 |  115.37 |    4182.18 | -4066.81
```

(`date_trunc` on a `timestamptz` uses your session's `TimeZone` setting. The sample data sits well inside each month, so any time zone gives these numbers.)

### Running totals and frames

Aggregates like `SUM` and `AVG` become window functions when you add `OVER`. With an `ORDER BY`, they become *running* aggregates:

```sql
WITH order_totals AS (
    SELECT o.order_id, o.customer_id, o.ordered_at,
           SUM(oi.quantity * oi.unit_price) AS total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY o.order_id
)
SELECT customer_id, order_id, total,
       SUM(total) OVER (PARTITION BY customer_id ORDER BY ordered_at) AS running_total,
       AVG(total) OVER (ORDER BY ordered_at
                        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3
FROM order_totals
ORDER BY customer_id, ordered_at;
```

For Ada, `running_total` is 1918.98, 2717.98, 2787.85.

The **frame** is the subset of the partition the function sees for the current row. This is where subtle bugs live:

![A partition of eight ordered rows with the current row highlighted and three frames drawn: ROWS 2 PRECEDING to CURRENT ROW, the default RANGE UNBOUNDED PRECEDING to CURRENT ROW including peers with equal sort keys, and the whole partition](study/sql-zero-to-hero/window-frame.svg "Figure 5: Window frames. With ORDER BY, the default frame is RANGE UNBOUNDED PRECEDING to CURRENT ROW, and RANGE includes tied peer rows.")

- **No `ORDER BY` in `OVER`:** the frame is the whole partition. `SUM(x) OVER (PARTITION BY g)` gives the group total on every row, which is perfect for "percent of total".
- **`ORDER BY` with no explicit frame:** the default is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. `RANGE` treats rows with equal sort values as peers and includes *all* of them. With duplicate timestamps, your "running total" jumps by several rows at once. Use `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` when you mean "physically up to this row."
- **`ROWS`** counts physical rows. **`RANGE`** works on value distance (PostgreSQL 11+ allows `RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW`). **`GROUPS`** counts peer groups.

> **WARNING:** `LAST_VALUE(x) OVER (ORDER BY t)` almost always surprises people. The default frame ends at the current row, so it returns the current row's value. Write `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to see the true last value.

Other useful window functions: `NTILE(4)` (quartiles), `PERCENT_RANK()`, `CUME_DIST()`, `FIRST_VALUE`, `NTH_VALUE`. When several windows share a definition, name it once: `... OVER w ... WINDOW w AS (PARTITION BY customer_id ORDER BY ordered_at)`.

## Schema design: DDL, constraints and normalization

### DDL essentials

DDL (Data Definition Language) creates and changes structure: `CREATE`, `ALTER`, `DROP`. In PostgreSQL, DDL is **transactional**. You can `BEGIN`, alter three tables, and `ROLLBACK` if something looks wrong. MySQL and Oracle commit implicitly on most DDL, so be more careful there.

```sql
ALTER TABLE customers ADD COLUMN phone text;
ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;   -- fails here: every existing row is NULL
ALTER TABLE customers DROP COLUMN phone;
ALTER TABLE products  ALTER COLUMN price TYPE numeric(12,2);
```

Pick types deliberately:

| Need | PostgreSQL type | Avoid |
|---|---|---|
| Identifiers | `integer` / `bigint` identity, or `uuid` | `text` IDs with no reason |
| Money | `numeric(p, s)` | `real`, `double precision`, `money` |
| Points in time | `timestamptz` | `timestamp` (no time zone) for events |
| Calendar dates | `date` | strings |
| Short/long text | `text` (with a `CHECK` on length if needed) | arbitrary `varchar(255)` |
| True/false | `boolean` | `char(1)` 'Y'/'N' |
| Semi-structured | `jsonb` | `json` (unless you need exact text preserved) |

### Constraints are your last line of defense

Application code has bugs and gets rewritten. Constraints are enforced for every client, every script and every late-night manual fix.

- `NOT NULL`: a value is required.
- `UNIQUE`: no duplicates. A unique constraint allows multiple NULLs by default. PostgreSQL 15+ supports `UNIQUE NULLS NOT DISTINCT` to forbid that.
- `PRIMARY KEY`: `UNIQUE` plus `NOT NULL`, one per table.
- `FOREIGN KEY ... REFERENCES`: referential integrity, with actions `ON DELETE CASCADE | SET NULL | RESTRICT | NO ACTION`.
- `CHECK (expr)`: any row-level rule, like `CHECK (quantity > 0)`.
- `EXCLUDE` (PostgreSQL): generalized uniqueness, for example "no two bookings for the same room may overlap in time."

**Natural vs surrogate keys.** A *natural* key is meaningful data (email, SKU). A *surrogate* key is a meaningless generated number. The shop uses surrogate primary keys plus `UNIQUE` constraints on natural keys. You get stable, compact join keys, and emails and SKUs can still change without rewriting every foreign key.

> **NOTE:** PostgreSQL automatically indexes primary keys and unique constraints, but **not foreign key columns**. `orders.customer_id` and `order_items.product_id` have no index yet. Joins and `ON DELETE` checks on them will scan. You'll fix that in the indexing section.

### Normalization: one fact in one place

Normalization is a set of rules for removing redundancy, so you can't end up with the same fact stored twice with different values. Picture how an order might look in a spreadsheet:

```text
order_id | customer_email   | customer_country | items
---------+------------------+------------------+--------------------------------
       1 | ada@example.com  | UK               | ThinkPad X1 x1, USB-C Cable x2
```

![Four stages of normalizing an order spreadsheet: unnormalized with a repeating items list, 1NF with one item per row, 2NF moving product name out of the composite-key table, and 3NF moving customer attributes into a customers table](study/sql-zero-to-hero/normalization.svg "Figure 6: Normalizing the shop step by step. Each step removes a kind of redundancy and the update anomaly that comes with it.")

- **1NF: atomic values, no repeating groups.** The `items` cell holds a list. Split it into one row per item, with `(order_id, product)` as the key. Now you can query "who bought a USB-C cable?" without string parsing.
- **2NF: no partial dependencies.** With the composite key `(order_id, product_id)`, a column like `product_name` depends on `product_id` alone, only *part* of the key. Every order line repeats it, so renaming a product means updating thousands of rows. Move it into `products`.
- **3NF: no transitive dependencies.** In an `orders` table, `customer_email` depends on `customer_id`, which depends on `order_id`. A non-key column depending on another non-key column means the email is stored once per order. Move it into `customers`.
- **BCNF: every determinant is a candidate key.** A slightly stricter 3NF. It matters when a table has overlapping composite candidate keys. For example, in `(student, course, instructor)` where each instructor teaches exactly one course, `instructor -> course` holds, but `instructor` isn't a key. Split it into `(instructor, course)` and `(student, instructor)`.

The short version people quote: every non-key attribute must depend on "the key, the whole key, and nothing but the key."

### When to denormalize

Normalize by default. Denormalize **deliberately**, with a reason you could write in a code review:

- **Historical snapshots** are *correct* data, not redundancy. `order_items.unit_price` records what the customer actually paid.
- **Read-heavy aggregates**, like a cached `orders_count` on customers or a nightly reporting table. Keep them in sync with triggers or a materialized view, and accept the write cost.
- **Analytics warehouses** use star schemas (wide fact tables plus dimension tables) on purpose, because scans dominate there, not updates.

Measure first. A missing index is a far more common problem than "too many joins."

## Writing data: DML, upserts and transactions

### INSERT, UPDATE, DELETE and RETURNING

> **TIP:** The examples from here on change the sample data. To keep the numbers in later sections matching, run them between `BEGIN;` and `ROLLBACK;`, or re-run the setup script afterwards.

```sql
INSERT INTO customers (email, full_name, country)
VALUES ('barbara@example.com', 'Barbara Liskov', 'US')
RETURNING customer_id, created_at;

UPDATE products SET price = price * 0.9 WHERE category_id = 6;

DELETE FROM orders WHERE status = 'cancelled' AND ordered_at < now() - interval '2 years';
```

`RETURNING` (PostgreSQL, SQLite 3.35+, MariaDB for INSERT/DELETE; SQL Server has `OUTPUT`) hands back the affected rows. That saves a round trip to fetch generated IDs.

> **WARNING:** An `UPDATE` or `DELETE` without `WHERE` hits every row. Build the habit: write the `WHERE` first, run it as a `SELECT` to see what matches, then change `SELECT` to `DELETE`. Better yet, do it inside `BEGIN` so you can `ROLLBACK`.

`UPDATE ... FROM` updates using another table. Mark paid orders as shipped when every item is a book (category 6):

```sql
UPDATE orders o
SET status = 'shipped'
FROM (
    SELECT oi.order_id
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
    GROUP BY oi.order_id
    HAVING bool_and(coalesce(p.category_id = 6, false))
) books_only
WHERE o.order_id = books_only.order_id
  AND o.status = 'paid';
```

Why the `coalesce`? Like every aggregate, `bool_and` skips NULLs. The USB-C cable has no category, so `category_id = 6` is NULL for it, and without the `coalesce` an order holding a cable plus a book would count as "books only." NULL finds its way into places like this all the time.

### Upserts: INSERT ... ON CONFLICT and MERGE

"Insert, or update if it already exists" is so common that every engine has syntax for it. PostgreSQL's `ON CONFLICT` is atomic and safe under concurrency:

```sql
INSERT INTO products (sku, name, category_id, price, stock)
VALUES ('PHN-001', 'Pixel 9', 4, 749.00, 20)
ON CONFLICT (sku) DO UPDATE
SET price = EXCLUDED.price,
    stock = products.stock + EXCLUDED.stock
RETURNING product_id, price, stock;
```

`EXCLUDED` is the row you tried to insert. Use `ON CONFLICT DO NOTHING` for "insert if missing." Identity values are consumed even when the conflict path runs, so expect gaps in IDs. That's normal. Never rely on IDs being contiguous.

PostgreSQL 15+ also supports the SQL-standard `MERGE`, which handles more complex synchronization logic. PostgreSQL 17 added `RETURNING` and `WHEN NOT MATCHED BY SOURCE` to it:

```sql
MERGE INTO products AS p
USING (VALUES ('PHN-002', 'Pixel 9 Pro', 4, 999.00, 10))
      AS s (sku, name, category_id, price, stock)
ON p.sku = s.sku
WHEN MATCHED THEN
    UPDATE SET price = s.price, stock = p.stock + s.stock
WHEN NOT MATCHED THEN
    INSERT (sku, name, category_id, price, stock)
    VALUES (s.sku, s.name, s.category_id, s.price, s.stock);
```

| Engine | Upsert syntax |
|---|---|
| PostgreSQL | `INSERT ... ON CONFLICT`, `MERGE` (15+) |
| MySQL | `INSERT ... ON DUPLICATE KEY UPDATE` |
| SQLite | `INSERT ... ON CONFLICT` (3.24+) |
| SQL Server / Oracle | `MERGE` |

> **NOTE:** In PostgreSQL, `MERGE` isn't a drop-in replacement for `ON CONFLICT` under heavy concurrency. Two sessions merging the same new key at the same moment can still hit a unique violation. For simple upserts on a unique key, prefer `ON CONFLICT`.

### Transactions and ACID

A transaction groups statements into one unit:

```sql
BEGIN;

WITH new_order AS (
    INSERT INTO orders (customer_id) VALUES (2)
    RETURNING order_id
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT n.order_id, p.product_id, 1, p.price
FROM new_order n
CROSS JOIN products p
WHERE p.product_id = 3;

UPDATE products SET stock = stock - 1 WHERE product_id = 3;

COMMIT;   -- or ROLLBACK; to undo everything since BEGIN
```

ACID is the guarantee:

- **Atomicity:** all or nothing. If the stock update fails the `CHECK (stock >= 0)`, the order is never created.
- **Consistency:** every committed state satisfies all constraints.
- **Isolation:** concurrent transactions don't see each other's half-done work (to a degree you choose, below).
- **Durability:** once `COMMIT` returns, the change survives a crash. PostgreSQL writes it to the write-ahead log (WAL) first.

`SAVEPOINT name` / `ROLLBACK TO name` undoes part of a transaction. That's useful in scripts that should carry on past a failed step.

### Isolation levels and anomalies

Full isolation (as if transactions ran one at a time) costs performance, so the SQL standard defines weaker levels by which **anomalies** they allow:

- **Dirty read:** you see another transaction's *uncommitted* change.
- **Non-repeatable read:** you read a row twice and get different values, because someone committed in between.
- **Phantom read:** you re-run a range query and new rows appear.
- **Lost update:** two transactions read-modify-write the same row, and one overwrites the other.
- **Write skew / serialization anomaly:** two transactions each read overlapping data, make decisions based on it, and write different rows. Each is valid alone. Together they break a rule, like "at least one doctor must be on call."

![Table of isolation levels READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ and SERIALIZABLE against dirty read, non-repeatable read, phantom and serialization anomaly, showing standard behavior and PostgreSQL specifics, plus a timeline of a lost update](study/sql-zero-to-hero/isolation.svg "Figure 7: Isolation levels vs anomalies, and a lost update in action. PostgreSQL is stricter than the standard at the lower levels.")

PostgreSQL specifics:

- **READ COMMITTED** is the default (also in SQL Server and Oracle; MySQL InnoDB defaults to REPEATABLE READ). Each *statement* sees a fresh snapshot.
- **READ UNCOMMITTED** behaves like READ COMMITTED. PostgreSQL never shows dirty data.
- **REPEATABLE READ** is snapshot isolation. The whole transaction sees one snapshot, so phantoms can't happen either. If you try to update a row someone else changed since your snapshot, you get `could not serialize access due to concurrent update` and must retry.
- **SERIALIZABLE** uses Serializable Snapshot Isolation (SSI). It detects dangerous patterns, write skew included, and aborts one transaction with a serialization failure (SQLSTATE `40001`). Your application **must retry** such transactions.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- ... reads and writes ...
COMMIT;   -- may fail with 40001: retry the whole transaction
```

The pragmatic toolkit for avoiding lost updates at READ COMMITTED:

1. **Make the update relative and atomic:** `UPDATE products SET stock = stock - 1 WHERE product_id = 3 AND stock > 0;` then check the affected row count. No read-then-write gap.
2. **Lock what you read:** `SELECT ... FOR UPDATE` locks the rows until commit. Queue workers love `FOR UPDATE SKIP LOCKED`, where each worker grabs rows nobody else holds.
3. **Optimistic concurrency:** keep a `version` column and write `UPDATE ... SET version = version + 1 WHERE id = $1 AND version = $2`. Zero rows updated means someone beat you, so reload and retry.

Keep transactions **short**. A transaction left open while your code calls a payment API holds locks and stops `VACUUM` from cleaning up old row versions.

## Indexes and EXPLAIN

### What an index is

Without an index, finding `WHERE email = 'grace@example.com'` means reading every row: a **sequential scan**. An index is a separate, sorted data structure that maps key values to row locations. It works like the index at the back of a book.

PostgreSQL's default is the **B-tree** (really a B+tree). The intuition:

![B-tree index with a root page, internal pages and linked leaf pages holding sorted keys and row pointers, showing the path taken to find one key and a range scan walking right along the leaves](study/sql-zero-to-hero/btree.svg "Figure 8: A B-tree lookup walks from the root to one leaf in a few page reads. A range scan then follows the sibling links along the leaves.")

- Pages are wide: hundreds of keys per page. So even a billion-row index is only 3-5 levels deep. A lookup reads a handful of pages instead of millions.
- Leaf pages are **sorted and linked**, so the same index serves equality (`=`), ranges (`<`, `BETWEEN`), prefix matches (`LIKE 'abc%'`, with the `text_pattern_ops` operator class or the C collation), `ORDER BY` and `MIN`/`MAX`.
- Each leaf entry points to a row in the table (the *heap*). Fetching that row is a separate, often random, read.

Other index types in PostgreSQL: **Hash** (equality only), **GIN** (inverted index for `jsonb`, arrays, full-text search), **GiST** / **SP-GiST** (geometry, ranges, nearest-neighbor) and **BRIN** (tiny summaries for huge, naturally ordered tables like append-only logs).

### Creating useful indexes

```sql
-- Foreign keys: index them (PostgreSQL won't do it for you)
CREATE INDEX orders_customer_id_idx     ON orders (customer_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);

-- Composite: equality column first, then the range/sort column
CREATE INDEX orders_customer_ordered_idx ON orders (customer_id, ordered_at DESC);

-- Expression index: makes case-insensitive lookup indexable
CREATE UNIQUE INDEX customers_email_lower_idx ON customers (lower(email));

-- Partial index: only the rows you actually query
CREATE INDEX orders_pending_idx ON orders (ordered_at) WHERE status = 'pending';

-- Covering index: extra payload columns enable index-only scans
CREATE INDEX orders_customer_cover_idx ON orders (customer_id) INCLUDE (status, ordered_at);
```

On a busy production table, use `CREATE INDEX CONCURRENTLY`. It builds without blocking writes (slower, and it can't run inside a transaction block).

### Composite index column order

A composite index on `(customer_id, ordered_at)` is sorted by `customer_id` first, then by `ordered_at` within each customer, like a phone book sorted by last name, then first name. So:

| Query predicate | Can use `(customer_id, ordered_at)` efficiently? |
|---|---|
| `customer_id = 3` | Yes (leading column) |
| `customer_id = 3 AND ordered_at >= '2025-06-01'` | Yes, the ideal case |
| `customer_id = 3 ORDER BY ordered_at DESC LIMIT 10` | Yes, no sort needed |
| `ordered_at >= '2025-06-01'` alone | Poorly: no leading column |
| `customer_id IN (1, 3) AND ordered_at > ...` | Yes |

The rule of thumb: **equality columns first, then range or sort columns.** A range condition on an early column stops later columns from narrowing the search. PostgreSQL 18 added B-tree *skip scan*, which can use an index without a condition on its leading column when that column has few distinct values. It's a nice bonus, not something to design around.

### Covering indexes and index-only scans

If every column a query needs is in the index, PostgreSQL can answer from the index alone, an **Index Only Scan**, and skip the heap. `INCLUDE` adds non-key payload columns for exactly this. One caveat: index-only scans only skip the heap for pages marked all-visible in the visibility map, which `VACUUM` maintains. Tables with heavy churn benefit less.

### When indexes hurt (or don't help)

- **Every index slows down writes.** Each `INSERT` updates every index, and so can an `UPDATE`. A table with 12 indexes pays for 12 extra writes per row.
- **Low selectivity.** If a predicate matches 30% of the table, a sequential scan beats thousands of random heap reads. The planner knows this and ignores your index, correctly.
- **Non-sargable predicates.** `WHERE lower(email) = ...` can't use an index on `email`. `WHERE ordered_at::date = '2025-06-01'` can't use an index on `ordered_at`. Rewrite as a range (`ordered_at >= '2025-06-01' AND ordered_at < '2025-06-02'`) or create a matching expression index.
- **Leading wildcards.** `LIKE '%cable'` can't use a B-tree. Use the `pg_trgm` extension with a GIN index for substring search.
- **Duplicates and unused indexes** cost disk, memory and write time for nothing. Check `pg_stat_user_indexes.idx_scan` and drop indexes that are never used.

### Reading EXPLAIN and EXPLAIN ANALYZE

`EXPLAIN` shows the plan the planner *chose*, with estimated costs. `EXPLAIN ANALYZE` actually *runs* the query and adds real timings and row counts. (Careful: that includes `INSERT`/`UPDATE`/`DELETE`. Wrap those in `BEGIN ... ROLLBACK`.)

Seven orders is too few to see anything interesting, so generate a million:

```sql
INSERT INTO orders (customer_id, status, ordered_at)
SELECT 1 + (random() * 4)::int,
       (ARRAY['pending', 'paid', 'shipped', 'cancelled'])[1 + (random() * 3)::int],
       timestamptz '2024-01-01' + random() * interval '600 days'
FROM generate_series(1, 1000000);

ANALYZE orders;   -- refresh planner statistics
```

Now ask for one customer's latest orders, first with only the primary key. (If you already created the indexes above, drop `orders_customer_ordered_idx` and `orders_customer_cover_idx` to see the "before" plan.)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT order_id, status, ordered_at
FROM orders
WHERE customer_id = 3
ORDER BY ordered_at DESC
LIMIT 10;
```

A typical plan without a suitable index looks like this (abridged; your numbers will differ):

```text
Limit  (actual time=61.2..63.9 rows=10 loops=1)
  ->  Gather Merge  (actual time=61.2..63.9 rows=10 loops=1)
        Workers Planned: 2
        ->  Sort  (actual time=55.0..55.0 rows=8 loops=3)
              Sort Key: ordered_at DESC
              Sort Method: top-N heapsort  Memory: 26kB
              ->  Parallel Seq Scan on orders  (actual time=0.02..45.1 rows=83000 loops=3)
                    Filter: (customer_id = 3)
                    Rows Removed by Filter: 250000
```

After `CREATE INDEX orders_customer_ordered_idx ON orders (customer_id, ordered_at DESC);`:

```text
Limit  (actual time=0.03..0.05 rows=10 loops=1)
  ->  Index Scan using orders_customer_ordered_idx on orders  (actual time=0.03..0.04 rows=10 loops=1)
        Index Cond: (customer_id = 3)
```

The sort disappeared because the index already delivers rows in the right order, and the scan stops after 10 rows. How to read any plan:

- **Read inside-out.** The most indented nodes run first and feed their parents.
- **`cost=startup..total`** is in arbitrary planner units. Compare costs between plans, not against milliseconds.
- **Estimated `rows` vs actual `rows`.** Big mismatches (100x or more) mean stale or insufficient statistics. Run `ANALYZE` and consider extended statistics (`CREATE STATISTICS`) for correlated columns. Bad estimates cause bad join choices.
- **`loops`**: actual time and rows are *per loop*. A cheap inner node with `loops=50000` is where the time goes.
- **`Rows Removed by Filter`** in the hundreds of thousands means you're scanning much more than you return. That's an index opportunity.
- **Sorts spilling** (`Sort Method: external merge  Disk: ...`) mean `work_mem` is too small for this query.
- **`BUFFERS`** shows pages hit in cache vs read from disk. PostgreSQL 18 includes buffer statistics in `EXPLAIN ANALYZE` by default.

Common node types:

| Node | Meaning |
|---|---|
| Seq Scan | Read the whole table |
| Index Scan | Walk the index, fetch each matching row from the heap |
| Index Only Scan | Answer from the index alone |
| Bitmap Index/Heap Scan | Collect matching row locations, then read heap pages in physical order. Good for medium selectivity |
| Nested Loop | For each outer row, probe the inner side. Great when the outer side is small and the inner side is indexed |
| Hash Join | Build a hash table on the smaller input, stream the larger one. The workhorse for big equality joins |
| Merge Join | Merge two inputs already sorted on the join key |
| HashAggregate / GroupAggregate | GROUP BY via a hash table or via sorted input |

## Views, JSON and security

### Views and materialized views

A **view** is a saved query that behaves like a table. It stores no data. Every query against it re-runs the underlying SQL.

```sql
CREATE VIEW order_totals AS
SELECT o.order_id, o.customer_id, o.status, o.ordered_at,
       SUM(oi.quantity * oi.unit_price) AS total
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id;

SELECT * FROM order_totals WHERE customer_id = 1;
```

Views give a stable interface over changing tables, hide complexity, and restrict what users can see (grant access to the view, not the base table). Simple single-table views are even automatically updatable. In PostgreSQL 15+, `CREATE VIEW ... WITH (security_invoker = true)` makes the view check permissions and row-level security as the *querying* user instead of the view owner.

A **materialized view** stores the result physically. It's fast to read and stale until you refresh it:

```sql
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT date_trunc('month', o.ordered_at) AS month,
       SUM(oi.quantity * oi.unit_price)  AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status <> 'cancelled'
GROUP BY 1;

CREATE UNIQUE INDEX ON monthly_revenue (month);

REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;  -- needs the unique index; readers aren't blocked
```

Use them for dashboards and expensive reports where "as of the last refresh" is acceptable. Schedule the refresh with cron, `pg_cron`, or your job runner. PostgreSQL has no built-in incremental refresh.

### JSON in PostgreSQL

`jsonb` stores parsed, binary JSON that can be indexed. It's ideal for genuinely variable attributes, like laptops having RAM and books having page counts, without a column for every possibility:

```sql
ALTER TABLE products ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}';

UPDATE products SET attributes = '{"ram_gb": 32, "color": "black", "ports": ["usb-c", "hdmi"]}'
WHERE sku = 'LAP-001';
UPDATE products SET attributes = '{"ram_gb": 16, "color": "silver", "ports": ["usb-c"]}'
WHERE sku = 'LAP-002';

-- -> returns jsonb, ->> returns text
SELECT name,
       attributes ->> 'color'           AS color,
       (attributes ->> 'ram_gb')::int   AS ram_gb
FROM products
WHERE attributes @> '{"ports": ["hdmi"]}';   -- containment: ThinkPad X1

-- SQL/JSON path
SELECT name FROM products WHERE attributes @? '$.ram_gb ? (@ >= 16)';

-- A GIN index accelerates @>, ?, ?| and ?& (and @? / @@ jsonpath queries)
CREATE INDEX products_attributes_gin ON products USING gin (attributes);
```

PostgreSQL 17 added the SQL/JSON standard functions `JSON_VALUE`, `JSON_QUERY`, `JSON_EXISTS` and `JSON_TABLE`, which turns JSON into rows:

```sql
SELECT p.name, jt.port
FROM products p,
     JSON_TABLE(p.attributes, '$.ports[*]' COLUMNS (port text PATH '$')) AS jt;
```

Going the other way, building JSON for an API straight from relational data, is often faster than assembling it in application code:

```sql
SELECT jsonb_build_object(
           'order_id', o.order_id,
           'items', jsonb_agg(jsonb_build_object('product', p.name, 'qty', oi.quantity))
       ) AS order_json
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p     ON p.product_id = oi.product_id
WHERE o.order_id = 1
GROUP BY o.order_id;
```

> **TIP:** Use JSON for the parts that really vary, not as a way to avoid designing a schema. Anything you filter, join or constrain on regularly (customer IDs, status, price) belongs in real columns with real types and constraints.

### SQL injection and parameterized queries

SQL injection happens when user input is pasted into SQL text and changes the query's *structure*:

```ts
// VULNERABLE: never build SQL by string concatenation
const sql = `SELECT * FROM customers WHERE email = '${email}'`;
// email = "' OR '1'='1"  ->  WHERE email = '' OR '1'='1'  -> every customer leaks
```

The fix is **parameterized queries** (bind parameters). The SQL text and the values travel separately, so values can never become syntax:

```ts
// node-postgres
const { rows } = await pool.query(
  'SELECT customer_id, full_name FROM customers WHERE email = $1',
  [email]
);
```

```python
# psycopg 3
cur.execute("SELECT customer_id, full_name FROM customers WHERE email = %s", (email,))
```

Parameters can only stand in for *values*, never identifiers or keywords. For a dynamic sort column, map user input to a fixed allow-list (`{"price": "price", "name": "name"}`) and never interpolate raw input. ORMs parameterize for you, until someone reaches for the raw-SQL escape hatch. Review those spots carefully.

### Roles, GRANT and least privilege

PostgreSQL has one concept, the **role**. A role with `LOGIN` is what other systems call a user, and roles can be members of other roles, like groups.

```sql
-- A group role for read-only reporting
CREATE ROLE reporting NOLOGIN;
GRANT CONNECT ON DATABASE shop TO reporting;
GRANT USAGE ON SCHEMA public TO reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reporting;  -- future tables

-- A person who inherits it
CREATE ROLE alice LOGIN PASSWORD 'change-me' IN ROLE reporting;

-- The application: only what it needs
CREATE ROLE shop_app LOGIN PASSWORD 'change-me';
GRANT USAGE ON SCHEMA public TO shop_app;
GRANT SELECT, INSERT, UPDATE ON orders, order_items TO shop_app;
GRANT SELECT ON products, categories, customers TO shop_app;
```

Your application should never connect as a superuser or as the owner of the tables. If it's compromised, the damage is limited to what its grants allow. `ALTER DEFAULT PRIVILEGES` covers tables created *later* by the role running it. Since PostgreSQL 15, ordinary users can no longer create objects in the `public` schema by default. PostgreSQL 14+ also has predefined roles like `pg_read_all_data`.

### Row-level security

Grants work per table. **Row-level security (RLS)** works per row: each role sees only the rows a policy allows. Multi-tenant SaaS apps and Supabase-style backends lean on it heavily.

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_sees_own_orders ON orders
    FOR SELECT
    TO shop_app
    USING (customer_id = current_setting('app.customer_id', true)::int);

-- Per request, inside the app's transaction:
BEGIN;
SELECT set_config('app.customer_id', '3', true);  -- true = local to this transaction
SELECT order_id, status FROM orders;               -- only Grace's orders
COMMIT;
```

When RLS is enabled and no policy applies, the default is *deny*. If the setting is missing, `current_setting(..., true)` returns NULL, and the policy matches nothing, which is the safe failure mode. Table owners and superusers bypass RLS unless you also run `ALTER TABLE orders FORCE ROW LEVEL SECURITY`. Because `shop_app` only has a `SELECT` policy here, its `INSERT`s and `UPDATE`s on `orders` are now denied too. Add `FOR INSERT ... WITH CHECK (...)` and `FOR UPDATE` policies before relying on this in a real app.

## Anti-patterns and interview practice

### Anti-patterns to unlearn

1. **`SELECT *` in application code.** It fetches columns you don't need, prevents index-only scans, and breaks when columns are added or reordered. Name your columns.
2. **N+1 queries.** Loading 100 orders, then running one query per order for its items, makes 101 round trips. Use a join, or `WHERE order_id = ANY($1)` with an array parameter.
3. **`OFFSET` pagination on large tables.** `OFFSET 100000` still reads and throws away 100,000 rows. Use **keyset pagination**: `WHERE (ordered_at, order_id) < ($last_ts, $last_id) ORDER BY ordered_at DESC, order_id DESC LIMIT 20`, backed by an index on the same columns.
4. **`NOT IN` with a nullable subquery.** Silent empty results. Use `NOT EXISTS`.
5. **`DISTINCT` to hide duplicates from a bad join.** Find the fan-out and fix the join, or aggregate before joining.
6. **Functions on indexed columns in `WHERE`.** Non-sargable. Rewrite as a range or add an expression index.
7. **Comma-separated lists in a column** (`tags = 'red,blue'`). This violates 1NF. You can't index, join or constrain it. Use a junction table (or a proper array/`jsonb` column with a GIN index if you must).
8. **Entity-Attribute-Value tables** (`entity_id, attribute_name, value text`). You lose every type and constraint, and queries become pivot nightmares. Use real columns, or `jsonb` for the genuinely dynamic part.
9. **Floats for money, `timestamp` without time zone for events, strings for dates.** Use `numeric`, `timestamptz` and `date`.
10. **`BETWEEN` with timestamps.** `ordered_at BETWEEN '2025-06-01' AND '2025-06-30'` misses everything after midnight on the 30th. Use half-open ranges: `>= '2025-06-01' AND < '2025-07-01'`.
11. **Missing foreign keys "for performance".** The integrity bugs you'll clean up later cost far more than the checks do.
12. **Long-running transactions.** They hold locks, block `VACUUM`, and bloat tables. Commit early, and never hold a transaction open across a network call.

### Practice problems

Try each one before reading the solution. They're typical of SQL interview rounds, and all of them run against the shop data. If you ran any of the data-changing examples (DML, upserts, the transaction, the million-row insert) without rolling them back, drop and re-create the database first so your results match the answers.

> **EXERCISE:** 1. Find the second most expensive product in each category. Categories with only one product should not appear.

```sql
SELECT category_id, name, price
FROM (
    SELECT p.*, DENSE_RANK() OVER (PARTITION BY category_id ORDER BY price DESC) AS dr
    FROM products p
    WHERE category_id IS NOT NULL
) ranked
WHERE dr = 2;
-- 3 | MacBook Air               | 1299.00
-- 6 | SQL Performance Explained |   39.90
```

`DENSE_RANK` handles ties sensibly: two products sharing the top price both rank 1, and the next price ranks 2.

> **EXERCISE:** 2. For each customer, show their first order (ID and date). Customers without orders should appear with NULLs.

```sql
SELECT DISTINCT ON (c.customer_id)
       c.full_name, o.order_id, o.ordered_at
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
ORDER BY c.customer_id, o.ordered_at;
-- Ada -> 1, Alan -> 2, Grace -> 4, Linus -> 5, Margaret -> NULL
```

The portable version uses `ROW_NUMBER() OVER (PARTITION BY c.customer_id ORDER BY o.ordered_at)` and keeps `rn = 1`.

> **EXERCISE:** 3. Which product has sold the most units (non-cancelled orders), and what share of all units sold is that?

```sql
WITH units AS (
    SELECT oi.product_id, SUM(oi.quantity) AS units
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status <> 'cancelled'
    GROUP BY oi.product_id
)
SELECT p.name, u.units,
       ROUND(100.0 * u.units / SUM(u.units) OVER (), 1) AS pct_of_units
FROM units u
JOIN products p ON p.product_id = u.product_id
ORDER BY u.units DESC
LIMIT 1;
-- USB-C Cable | 5 | 35.7
```

Note `100.0 * ...`. Without the decimal point, integer division truncates in PostgreSQL, SQL Server and SQLite (`5 / 14 = 0`). MySQL's `/` always returns a decimal.

> **EXERCISE:** 4. Print the full referral chain above Linus Torvalds (who referred him, who referred them, and so on).

```sql
WITH RECURSIVE chain AS (
    SELECT customer_id, full_name, referred_by, 0 AS level
    FROM customers
    WHERE full_name = 'Linus Torvalds'
  UNION ALL
    SELECT c.customer_id, c.full_name, c.referred_by, ch.level + 1
    FROM customers c
    JOIN chain ch ON c.customer_id = ch.referred_by
)
SELECT level, full_name FROM chain ORDER BY level;
-- 0 Linus Torvalds, 1 Grace Hopper, 2 Ada Lovelace
```

> **EXERCISE:** 5. Find duplicate customer emails when case is ignored (e.g. `Ada@Example.com` vs `ada@example.com`). Then prevent them from ever happening again.

```sql
SELECT lower(email) AS email_norm, COUNT(*), array_agg(customer_id)
FROM customers
GROUP BY lower(email)
HAVING COUNT(*) > 1;

-- Prevention: a unique expression index (fails to build until existing duplicates are fixed)
CREATE UNIQUE INDEX customers_email_lower_uq ON customers (lower(email));
```

The `citext` extension (a case-insensitive text type) is an alternative. Skip this `CREATE` if you already built `customers_email_lower_idx` in the indexing section, which does the same job.

> **EXERCISE:** 6. Gaps and islands: given a table of daily logins, find each user's longest streak of consecutive days.

```sql
CREATE TABLE logins (customer_id int, login_date date, PRIMARY KEY (customer_id, login_date));
INSERT INTO logins VALUES
    (1, '2025-06-01'), (1, '2025-06-02'), (1, '2025-06-03'),
    (1, '2025-06-05'), (1, '2025-06-06'),
    (2, '2025-06-01'), (2, '2025-06-03');

WITH grp AS (
    SELECT customer_id, login_date,
           login_date - (ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY login_date))::int AS island
    FROM logins
)
SELECT customer_id, MAX(streak) AS longest_streak
FROM (
    SELECT customer_id, island, COUNT(*) AS streak
    FROM grp
    GROUP BY customer_id, island
) s
GROUP BY customer_id;
-- customer 1: 3, customer 2: 1
```

The trick: in a run of consecutive dates, the date minus its row number is constant (`date - integer` gives a date in PostgreSQL). Each constant value is one "island". This pattern solves a whole family of interview questions: sessions, consecutive wins, uninterrupted uptime.

> **EXERCISE:** 7. Explain why this query is slow on a million orders, and fix it: `SELECT * FROM orders WHERE date(ordered_at) = '2025-06-12';`

Wrapping the column in a function makes the predicate non-sargable, so a plain index on `ordered_at` can't be used. (`date()` on a `timestamptz` also depends on the session time zone.) Rewrite as a half-open range, backed by an index on `ordered_at`:

```sql
CREATE INDEX orders_ordered_at_idx ON orders (ordered_at);

SELECT order_id, customer_id, status, ordered_at
FROM orders
WHERE ordered_at >= timestamptz '2025-06-12 00:00+00'
  AND ordered_at <  timestamptz '2025-06-13 00:00+00';
```

## Cheat sheet

```text
LOGICAL ORDER   FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT (windows) -> DISTINCT -> ORDER BY -> LIMIT
NULL            IS NULL / IS NOT NULL / IS DISTINCT FROM; COALESCE(a,b); NULLIF(a,b); COUNT(col) skips NULLs
                x NOT IN (subquery with NULL) -> no rows. Use NOT EXISTS
JOINS           INNER = matches only; LEFT = all left + NULLs; FULL = all both sides; CROSS = every pair
                filter right table of a LEFT JOIN in ON, not WHERE; watch fan-out before SUM
GROUPING        non-aggregated SELECT columns must be in GROUP BY; WHERE filters rows, HAVING filters groups
                COUNT(*) FILTER (WHERE ...) for conditional aggregates
SUBQUERIES      EXISTS / NOT EXISTS for semi/anti joins; LATERAL for top-N per row
CTE             WITH x AS (...) ; WITH RECURSIVE t AS (anchor UNION ALL step joining t)
SET OPS         UNION (dedup) / UNION ALL (keep) / INTERSECT / EXCEPT
WINDOWS         fn() OVER (PARTITION BY .. ORDER BY .. ROWS BETWEEN .. AND ..)
                ROW_NUMBER (no ties) RANK (gaps) DENSE_RANK (no gaps) LAG/LEAD NTILE FIRST_VALUE
                default frame with ORDER BY = RANGE UNBOUNDED PRECEDING..CURRENT ROW (includes peers)
                filter on a window result in an outer query
DDL             GENERATED ALWAYS AS IDENTITY; numeric for money; timestamptz for events; DDL is transactional
CONSTRAINTS     NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY (index it!), CHECK, EXCLUDE
NORMAL FORMS    1NF atomic; 2NF no partial dep; 3NF no transitive dep; BCNF every determinant is a key
UPSERT          INSERT .. ON CONFLICT (key) DO UPDATE SET col = EXCLUDED.col | DO NOTHING; MERGE (15+)
TRANSACTIONS    BEGIN; ... COMMIT | ROLLBACK; SAVEPOINT s; ROLLBACK TO s
ISOLATION (PG)  READ COMMITTED (default) < REPEATABLE READ (snapshot) < SERIALIZABLE (SSI, retry 40001)
LOST UPDATES    SET x = x - 1 atomically | SELECT .. FOR UPDATE | version column (optimistic)
INDEXES         B-tree default; composite = equality cols first, then range/sort
                INCLUDE (...) for index-only scans; partial (WHERE ..); expression (lower(email))
                CREATE INDEX CONCURRENTLY in production; every index taxes writes
EXPLAIN         EXPLAIN (ANALYZE, BUFFERS); read inside-out; compare est vs actual rows; watch loops
VIEWS           VIEW = saved query; MATERIALIZED VIEW = stored result, REFRESH ... CONCURRENTLY
JSONB           -> jsonb, ->> text, @> contains, @? jsonpath, GIN index, JSON_TABLE (17+)
SECURITY        parameters ($1 / %s), never concatenation; least-privilege roles; RLS policies
PAGINATION      keyset: WHERE (ts, id) < ($1, $2) ORDER BY ts DESC, id DESC LIMIT n
```

## Where to go next

- **The PostgreSQL documentation** (postgresql.org/docs): the tutorial chapter, then the chapters on queries, indexes, concurrency control (MVCC) and performance tips. It's one of the best-written manuals in open source.
- **Use The Index, Luke** (use-the-index-luke.com) by Markus Winand: free, engine-agnostic, and the clearest explanation of how indexes really work. His site modern-sql.com covers newer standard features.
- **"Designing Data-Intensive Applications"** by Martin Kleppmann: the chapters on storage engines, transactions and replication put everything here into a distributed-systems context.
- **"SQL Performance Explained"** (Winand) and **"The Art of PostgreSQL"** (Dimitri Fontaine) for going deeper on performance and idiomatic Postgres.
- **Practice sites:** pgexercises.com (PostgreSQL-specific, with a sample schema), plus the SQL sections of LeetCode, HackerRank and DataLemur for interview-style problems.
- **Tools:** `pg_stat_statements` to find your slowest queries in production, explain.dalibo.com or explain.depesz.com to visualize plans, and `pgbench` to load-test.

Next steps: add a `reviews` table to the shop with a rating `CHECK` and a unique constraint of one review per customer per product. Write a query for the top-rated product per category with a minimum of three reviews. Load a million rows and tune it with `EXPLAIN ANALYZE` until it runs in under a millisecond. Once you can do that without looking anything up, you're past "zero to hero" and into the part where you just keep getting better.
