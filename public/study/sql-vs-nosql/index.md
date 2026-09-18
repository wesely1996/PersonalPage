"SQL or NoSQL?" is one of the most-asked and least useful questions in software engineering. It sounds like a binary choice between two technologies, but "NoSQL" is not one thing: it is a label covering at least five very different data models, each with its own strengths, failure modes and operational personality. Meanwhile, the relational databases that NoSQL was supposed to replace have spent fifteen years quietly absorbing its best ideas.

This article gives you the mental models to make the choice on purpose. You will model the *same* e-commerce order in every major data model and query it in each one's native language. You will learn what ACID, BASE, CAP and PACELC actually promise (and what they are often misquoted as promising), how databases scale and why a single bad partition key can take down a system, how to design for access patterns, and how real companies have made these calls in public. At the end you get a decision framework, a big comparison table, and a cheat sheet.

The goal is not to crown a winner. It is to help you ask better questions: *what shape is my data, how will I read it, what must never be wrong, and how big will it really get?*

## A short history: how we got here

You understand today's database landscape much better once you see it as a sequence of reactions to real problems.

![Vertical timeline of database history from 1970 to 2025 grouped into relational, NoSQL, NewSQL and convergence eras](study/sql-vs-nosql/timeline.svg "Fifty years of databases: each era reacted to the limits of the one before")

### The relational era (1970 to mid-2000s)

In 1970, Edgar F. Codd at IBM published "A Relational Model of Data for Large Shared Data Banks". His idea was radical at the time: store data as *relations* (tables of rows), describe *what* you want with a declarative language, and let the system figure out *how* to fetch it. Before this, programs navigated hierarchical or network databases by following pointers, so every new question meant new code.

IBM's System R project produced SQL, Oracle shipped an early commercial SQL product in 1979, and SQL became an ANSI standard in 1986. By the late 1990s, open-source MySQL and PostgreSQL made relational databases free, and the LAMP stack put MySQL behind a huge share of the early web. For about thirty years, "database" basically meant "relational database".

Relational systems gave you a lot: a flexible query language, joins, constraints that the database enforces for you, and transactions with ACID guarantees. The trade-off was that they were designed around a single powerful machine.

### The web-scale era and the NoSQL wave (2006 to 2012)

Then a handful of companies hit problems no single machine could handle. Google published the **Bigtable** paper (2006), describing a sparse, distributed, sorted map spread across thousands of commodity servers. Amazon published the **Dynamo** paper (2007), describing a highly available key-value store that deliberately gave up strong consistency so the shopping cart would *always* accept writes, even during failures.

These papers inspired a wave of open-source systems: Cassandra (from Facebook, combining Dynamo's distribution with Bigtable's data model), MongoDB, Redis, CouchDB, HBase, Riak and more. In 2009 a meetup in San Francisco about "open-source, distributed, non-relational databases" used the hashtag #nosql, and the name stuck. (Later it was often reinterpreted as "Not Only SQL".)

The pitch was compelling: horizontal scaling on cheap hardware, flexible schemas that fit agile development, and data models that matched how applications actually used data. Many teams adopted NoSQL for good reasons. Many others adopted it because it was fashionable, and learned the hard way what they had given up.

### NewSQL and distributed SQL (2012 onward)

In 2012, Google published the **Spanner** paper: a globally distributed database with SQL-like querying and externally consistent (strictly serializable) transactions, using synchronized clocks (TrueTime) to order events across data centers. It showed that "SQL doesn't scale" was an engineering limitation, not a law of nature.

Spanner inspired a generation of **distributed SQL** databases: CockroachDB, TiDB, YugabyteDB, and cloud services such as Amazon Aurora DSQL (generally available since 2025). They speak SQL (often the PostgreSQL or MySQL wire protocol), shard and replicate automatically, and use consensus protocols such as Raft or Paxos to keep replicas consistent.

### Convergence (2014 to today)

The most important trend of the last decade is that the categories have blurred:

- **Relational databases went document-friendly.** PostgreSQL 9.4 (2014) added `JSONB`, a binary JSON type with indexing. MySQL, SQL Server and Oracle all have JSON support. Postgres 17 added SQL/JSON features such as `JSON_TABLE`, and PostgreSQL 18 (September 2025) added asynchronous I/O, a native `uuidv7()` function and virtual generated columns.
- **Document databases went transactional.** MongoDB 4.0 (2018) added multi-document ACID transactions on replica sets, and 4.2 (2019) extended them across shards.
- **Key-value stores gained stronger guarantees.** DynamoDB added ACID transactions (2018) and, in June 2025, global tables with multi-Region *strong* consistency.
- **Everything got vector search.** The rise of LLMs and retrieval-augmented generation (RAG) made similarity search a checkbox feature: `pgvector` for Postgres, Atlas Vector Search for MongoDB (and, from MongoDB 8.2, a public preview for self-managed Community and Enterprise editions), vector types in Cassandra 5.0, vector sets in Redis 8, plus dedicated vector databases.

> **NOTE:** The practical consequence of convergence: in 2026 the question is less "SQL or NoSQL?" and more "which data model, consistency guarantees and operational model fit this workload, and can one system I already run cover it?"

## The data models, one order at a time

Let's make this concrete. Throughout this section you will model one domain: an online shop. Customer **Ada** (id `c42`) places **order 1001** containing one mechanical keyboard (`KB-01`, 89.00) and two wireless mice (`MS-07`, 25.00 each), total 139.00.

![The same order shown as relational tables, a MongoDB document, Redis keys, a Cassandra partition and a Neo4j graph](study/sql-vs-nosql/data-models.svg "One order, five data models: same facts, very different shapes")

### Relational (PostgreSQL, MySQL, SQL Server, Oracle)

The relational model splits data into **normalized** tables so every fact is stored exactly once. Relationships are expressed with foreign keys and reassembled at read time with joins.

```sql
CREATE TABLE customers (
  id    text PRIMARY KEY,
  name  text NOT NULL,
  email text UNIQUE NOT NULL
);

CREATE TABLE products (
  sku   text PRIMARY KEY,
  name  text NOT NULL,
  stock int  NOT NULL CHECK (stock >= 0)
);

CREATE TABLE orders (
  id          bigint PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id),
  status      text NOT NULL DEFAULT 'PENDING',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id bigint  NOT NULL REFERENCES orders(id),
  sku      text    NOT NULL REFERENCES products(sku),
  qty      int     NOT NULL CHECK (qty > 0),
  price    numeric(10,2) NOT NULL,
  PRIMARY KEY (order_id, sku)
);
```

Reading the order back means joining:

```sql
SELECT o.id, c.name, i.sku, i.qty, i.price,
       SUM(i.qty * i.price) OVER (PARTITION BY o.id) AS total
FROM orders o
JOIN customers   c ON c.id = o.customer_id
JOIN order_items i ON i.order_id = o.id
WHERE o.id = 1001;
```

And placing an order is a transaction that must either fully happen or not happen at all:

```sql
BEGIN;
INSERT INTO orders (id, customer_id) VALUES (1001, 'c42');
INSERT INTO order_items VALUES (1001, 'KB-01', 1, 89.00), (1001, 'MS-07', 2, 25.00);
UPDATE products SET stock = stock - 1 WHERE sku = 'KB-01';
UPDATE products SET stock = stock - 2 WHERE sku = 'MS-07';
COMMIT;  -- if stock would go negative, the CHECK fails and nothing is saved
```

**Why it's good:** you can answer questions nobody anticipated ("revenue by product category per week for customers who signed up in March") without redesigning storage. The database enforces invariants (uniqueness, foreign keys, checks) so bugs in one service cannot corrupt data for everyone. The query optimizer picks join strategies for you.

**Where it hurts:** joins across very large tables cost CPU and I/O; the schema must be migrated when the shape changes; and scaling writes beyond one primary node requires sharding, which the classic relational engines do not do for you.

Modern Postgres also gives you a document escape hatch:

```sql
ALTER TABLE products ADD COLUMN attrs jsonb NOT NULL DEFAULT '{}';
CREATE INDEX products_attrs_gin ON products USING gin (attrs jsonb_path_ops);

-- all keyboards with a US layout
SELECT sku, name FROM products WHERE attrs @> '{"type": "keyboard", "layout": "US"}';
```

### Document (MongoDB, Couchbase, Firestore, Cosmos DB)

A document database stores self-describing, nested records, usually JSON or a binary variant (MongoDB uses BSON). The central idea is the **aggregate**: data that is read and written together is stored together.

```json
{
  "_id": 1001,
  "customer": { "id": "c42", "name": "Ada" },
  "status": "SHIPPED",
  "createdAt": { "$date": "2026-09-01T10:15:00Z" },
  "items": [
    { "sku": "KB-01", "name": "Mechanical Keyboard", "qty": 1, "price": 89.00 },
    { "sku": "MS-07", "name": "Wireless Mouse",      "qty": 2, "price": 25.00 }
  ],
  "total": 139.00
}
```

Notice what happened: the customer's name and the product names are **copied** into the order. That is deliberate denormalization. An order is a historical record, so you actually *want* the product name and price as they were at purchase time. Fetching the order is one read with no joins:

```javascript
db.orders.findOne({ _id: 1001 })

// all of Ada's orders, newest first; needs an index to be fast
db.orders.createIndex({ "customer.id": 1, createdAt: -1 })
db.orders.find({ "customer.id": "c42" }).sort({ createdAt: -1 }).limit(10)
```

Analytics use the **aggregation pipeline**, a sequence of stages:

```javascript
// top 5 products by revenue in August 2026
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2026-08-01"), $lt: ISODate("2026-09-01") } } },
  { $unwind: "$items" },
  { $group: {
      _id: "$items.sku",
      revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } }
  } },
  { $sort: { revenue: -1 } },
  { $limit: 5 }
])
```

And multi-document transactions exist when you need them (for example, decrementing stock in a separate `products` collection):

```javascript
const session = client.startSession();
await session.withTransaction(async () => {
  await orders.insertOne(orderDoc, { session });
  await products.updateOne(
    { _id: "KB-01", stock: { $gte: 1 } },
    { $inc: { stock: -1 } },
    { session }
  );
});
```

**Why it's good:** the stored shape matches the object in your code, reads of whole aggregates are fast, fields can vary between documents, and sharding is built in.

**Where it hurts:** data that is shared across many aggregates (a product name that changes) must be updated in many places or deliberately left stale. Documents have a size cap (16 MB in MongoDB), so unbounded arrays such as "all comments ever on a post" are an anti-pattern. Multi-document transactions work, but MongoDB's own guidance is that they carry a performance cost and should not replace good schema design; by default a transaction is aborted if it runs longer than 60 seconds.

> **TIP:** The document rule of thumb: *embed* what you read together and what belongs to the parent (order items); *reference* what is shared, large, or grows without bound (customers, product catalog, reviews).

### Key-value (Redis/Valkey, DynamoDB, etcd, Memcached)

A key-value store is a giant, distributed hash map: you `put` a value under a key and `get` it back. The database usually does not understand the value (in pure KV stores) or understands it only a little.

Redis is the best-known example, and it is richer than "just" key-value: values can be strings, hashes, lists, sets, sorted sets, streams and more, each with atomic operations.

```bash
# the whole order as an opaque JSON string, expires in 1 hour (cache use)
SET order:1001 '{"customer":"c42","total":139.0,"items":[...]}' EX 3600
GET order:1001

# order as a hash: update single fields without rewriting everything
HSET order:1001 customer c42 status SHIPPED total 139.00
HGET order:1001 status

# Ada's orders, sorted by timestamp (score) - a secondary "index" you maintain yourself
ZADD cust:c42:orders 1788257700 1001
ZREVRANGE cust:c42:orders 0 9

# best-seller leaderboard, updated atomically on every sale
ZINCRBY bestsellers 2 MS-07
ZREVRANGE bestsellers 0 4 WITHSCORES
```

Notice the pattern: if you want to find orders by customer, *you* build and maintain the `cust:c42:orders` structure. The database will not do it for you.

DynamoDB is a managed, distributed key-value and document store. Every item has a **partition key** and optionally a **sort key**, and efficient reads must provide the partition key:

```bash
aws dynamodb query \
  --table-name Shop \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"CUST#c42"},":sk":{"S":"ORDER#"}}' \
  --no-scan-index-forward --limit 10
```

**Why it's good:** predictable, very low latency (sub-millisecond for in-memory Redis, single-digit milliseconds for DynamoDB) at nearly any scale, because every request touches a known location.

**Where it hurts:** no ad-hoc queries. If you did not design a key for a question, answering it means a full scan. Redis keeps its dataset in memory, which makes it fast but expensive per gigabyte, and its durability depends on your persistence settings.

> **NOTE:** Licensing drifted here. In 2024 Redis moved from the BSD license to source-available licenses, which led the Linux Foundation to launch **Valkey**, a BSD-licensed fork. Redis 8 (2025) added AGPLv3 as an open-source option. At the time of writing (2026) both are actively developed and largely command-compatible; check each project's current license before you standardize.

### Wide-column (Cassandra, ScyllaDB, HBase, Bigtable)

"Wide-column" is a confusing name. In Cassandra and ScyllaDB, think of it as **a distributed map of partitions, where each partition holds rows sorted by a clustering key**. You design one table per query, and each table's primary key decides both *where* the data lives (partition key) and *how it is ordered* on disk (clustering columns).

```sql
-- CQL (Cassandra Query Language): looks like SQL, behaves very differently
CREATE TABLE shop.orders_by_customer (
  customer_id text,
  order_id    timeuuid,
  sku         text,
  qty         int,
  price       decimal,
  PRIMARY KEY ((customer_id), order_id, sku)
) WITH CLUSTERING ORDER BY (order_id DESC, sku ASC);

-- Ada's latest orders: one partition, rows already sorted - very fast
SELECT order_id, sku, qty, price
FROM shop.orders_by_customer
WHERE customer_id = 'c42'
LIMIT 20;
```

The double parentheses matter: `(customer_id)` is the **partition key** (which node stores the data), while `order_id, sku` are **clustering columns** (the sort order inside the partition). All of Ada's orders live together, newest first, so "latest 20 orders" is a single sequential read.

> **WARNING:** CQL looks like SQL, which invites SQL habits that break. For example, a column declared `STATIC` holds **one value per partition**, not per row, so putting an `order_total` there would overwrite it with every new order. And a partition that grows forever (every message ever sent in a busy channel) eventually becomes too large; bound partitions with a time bucket in the key, such as `((channel_id, month), message_id)`.

Order-level data such as the status and total goes in a second table keyed by order:

```sql
CREATE TABLE shop.orders_by_id (
  order_id    timeuuid PRIMARY KEY,
  customer_id text,
  status      text,
  total       decimal
);
```

Yes, you write the same order into two tables. In wide-column design, **duplication is the price of fast reads**, and query-first modeling is the rule. Asking something you did not design for fails loudly:

```sql
SELECT * FROM shop.orders_by_customer WHERE sku = 'KB-01';
-- Error: Cannot execute this query as it might involve data filtering ...
-- (you would need ALLOW FILTERING, i.e. a cluster-wide scan, or another table / index)
```

Consistency is tunable per request:

```sql
CONSISTENCY QUORUM;   -- cqlsh: a majority of replicas must acknowledge
INSERT INTO shop.orders_by_id (order_id, customer_id, status, total)
VALUES (now(), 'c42', 'PENDING', 139.00);
```

**Why it's good:** enormous write throughput (writes are appended to a commit log and an in-memory table, then flushed to immutable files), linear horizontal scaling, and multi-datacenter replication as a first-class feature with no single primary.

**Where it hurts:** no joins, limited ad-hoc querying, and "lightweight transactions" (compare-and-set via Paxos) are much slower than normal writes. Deletes create tombstones that can hurt read performance if you model queues or frequently deleted data. Cassandra 5.0 (2024) added Storage-Attached Indexes (SAI) and vector search, which make secondary lookups more practical, and full ACID transactions (the Accord protocol) are being developed for a future release.

### Graph (Neo4j, Amazon Neptune, Memgraph)

A graph database stores **nodes** and **relationships** as first-class citizens. A relationship is a stored pointer, so following it costs roughly the same no matter how big the graph is. This is called *index-free adjacency*.

```cypher
// create the order graph
MERGE (ada:Customer {id: 'c42', name: 'Ada'})
MERGE (o:Order {id: 1001, total: 139.00})
MERGE (kb:Product {sku: 'KB-01', name: 'Mechanical Keyboard'})
MERGE (ms:Product {sku: 'MS-07', name: 'Wireless Mouse'})
MERGE (ada)-[:PLACED]->(o)
MERGE (o)-[:CONTAINS {qty: 1, price: 89.00}]->(kb)
MERGE (o)-[:CONTAINS {qty: 2, price: 25.00}]->(ms);
```

Where graphs shine is multi-hop questions. "Customers who bought what Ada bought also bought..." is a four-hop traversal:

```cypher
MATCH (me:Customer {id: 'c42'})-[:PLACED]->(:Order)-[:CONTAINS]->(p:Product)
      <-[:CONTAINS]-(:Order)<-[:PLACED]-(other:Customer)
      -[:PLACED]->(:Order)-[:CONTAINS]->(rec:Product)
WHERE other <> me
  AND NOT EXISTS { (me)-[:PLACED]->(:Order)-[:CONTAINS]->(rec) }
RETURN rec.name AS recommendation, count(DISTINCT other) AS score
ORDER BY score DESC
LIMIT 5;
```

The equivalent SQL is five or six self-joins, and each extra hop can multiply the intermediate row count. For fraud rings, network topology, permission hierarchies, knowledge graphs and recommendations, graphs are both faster to write and faster to run.

**Where it hurts:** aggregate analytics over the whole dataset ("total revenue per month") are not what graphs are optimized for, and sharding a graph is hard because any partition cuts relationships.

> **NOTE:** Graph querying is being standardized. ISO published **GQL** (ISO/IEC 39075) in 2024, heavily influenced by Cypher, and SQL:2023 added **SQL/PGQ** for property-graph queries over relational tables. Some relational engines now implement SQL/PGQ, and in PostgreSQL recursive CTEs (`WITH RECURSIVE`) handle many hierarchy and path queries well.

### Time-series, search and vector databases

Three more families are specialized enough to deserve a mention, and you are likely to meet all of them.

**Time-series** databases (TimescaleDB, InfluxDB, QuestDB, Prometheus for metrics) optimize for append-heavy, timestamped data: sensor readings, metrics, prices. They partition by time, compress aggressively (often 90%+ for regular data), and expire old data cheaply. TimescaleDB is a Postgres extension, so it is plain SQL plus helpers:

```sql
SELECT time_bucket('5 minutes', ts) AS bucket,
       device_id,
       avg(temperature) AS avg_temp
FROM readings
WHERE ts > now() - interval '1 day'
GROUP BY bucket, device_id
ORDER BY bucket;
```

**Search engines** (Elasticsearch, OpenSearch, Solr, Meilisearch, Typesense) build inverted indexes for full-text search: tokenization, stemming, typo tolerance, relevance scoring (BM25), facets. They are rarely a good primary store, but they are the right tool for "search products for *wireles mous*":

```json
{
  "query": {
    "multi_match": {
      "query": "wireles mous",
      "fields": ["name^3", "description"],
      "fuzziness": "AUTO"
    }
  }
}
```

**Vector databases** (pgvector, Pinecone, Qdrant, Weaviate, Milvus, plus vector features in MongoDB, Redis, Cassandra, Elasticsearch and others) store embeddings, which are arrays of numbers produced by ML models, and find the nearest neighbors using approximate indexes such as HNSW. This powers semantic search and RAG:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE products ADD COLUMN embedding vector(1024);
CREATE INDEX ON products USING hnsw (embedding vector_cosine_ops);

-- 5 products most similar in meaning to the query embedding $1
SELECT sku, name
FROM products
ORDER BY embedding <=> $1
LIMIT 5;
```

> **TIP:** For most applications, start with vector search inside the database you already run (pgvector, MongoDB, Redis). Reach for a dedicated vector database when you have hundreds of millions of vectors, need advanced filtering at high QPS, or want features such as multi-tenancy tuned specifically for vectors.

## Schema-on-write vs schema-on-read

"Schemaless" is one of the most misleading words in databases. Every useful dataset has a schema. The real question is **who enforces it and when**.

- **Schema-on-write** (relational default): the database validates every write against a declared schema. Bad data is rejected at the door. Changing the shape requires a migration (`ALTER TABLE`).
- **Schema-on-read** (document and KV default): the database accepts any shape, and every reader must interpret what it finds. The schema lives in your application code, spread across every service and every version that ever wrote data.

Here is what schema-on-read looks like after two years in production:

```javascript
// reader code has to handle every historical shape
function customerName(order) {
  if (order.customer?.name) return order.customer.name;        // v3 (2025+)
  if (order.customerName) return order.customerName;           // v2 (2024)
  if (typeof order.customer === "string") return lookup(order.customer); // v1
  return "unknown";
}
```

Neither approach is free. Schema-on-write front-loads the work; schema-on-read spreads it across every reader forever. The pragmatic middle ground is available almost everywhere now:

```javascript
// MongoDB: enforce a schema where you want it, stay flexible where you don't
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["customer", "items", "total"],
      properties: {
        total: { bsonType: ["double", "decimal"], minimum: 0 },
        items: { bsonType: "array", minItems: 1 }
      }
    }
  },
  validationAction: "error"
})
```

```sql
-- Postgres: strict columns for what matters, jsonb for the long tail,
-- and a CHECK constraint to keep the jsonb honest
ALTER TABLE products
  ADD CONSTRAINT attrs_is_object CHECK (jsonb_typeof(attrs) = 'object');
```

> **WARNING:** "We don't need migrations because we're schemaless" is only true on day one. You still need a strategy for old data: lazy migration on read, background backfills, or a `schemaVersion` field. Plan it from the start.

Modern relational migrations are also much less painful than their reputation. In PostgreSQL, adding a nullable column, or a column with a constant default (since version 11), is a metadata-only change that does not rewrite the table. The operations that really hurt (changing a column type, adding a `NOT NULL` constraint to a huge table) have well-known online patterns: add the new column, dual-write, backfill in batches, validate, switch.

## Transactions: ACID, BASE and what they really promise

### ACID

A transaction groups operations into one logical unit. **ACID** describes the guarantees:

- **Atomicity**: all or nothing. If the stock update fails, the order insert is rolled back too.
- **Consistency**: the transaction moves the database from one valid state to another, respecting constraints you declared. (This "C" is about *your invariants*, and is a different thing from the "C" in CAP.)
- **Isolation**: concurrent transactions do not see each other's half-finished work. How strictly depends on the *isolation level*.
- **Durability**: once committed, the data survives a crash (it has been written to a durable log, and in replicated setups possibly to other nodes).

Isolation is where the real subtlety lives. Databases offer levels that trade correctness for concurrency:

| Level | Prevents | Still allows | Default in |
|---|---|---|---|
| Read committed | dirty reads | non-repeatable reads, lost updates, write skew | PostgreSQL, SQL Server, Oracle |
| Repeatable read / snapshot | the above + non-repeatable reads | write skew (in snapshot implementations) | MySQL InnoDB |
| Serializable | all anomalies: behaves as if transactions ran one at a time | nothing, but may abort transactions you must retry | CockroachDB, Spanner (strict) |

A classic bug that "ACID" alone does not prevent at the default level is **write skew**: two doctors each check "at least one other doctor is on call", both see "yes", and both go off call. Each transaction was individually valid; together they broke the invariant. `SERIALIZABLE` (or explicit locking with `SELECT ... FOR UPDATE`) prevents it.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) FROM on_call WHERE shift_id = 7;   -- sees 2
DELETE FROM on_call WHERE shift_id = 7 AND doctor = 'alice';
COMMIT;  -- one of two concurrent transactions gets a serialization error; retry it
```

### BASE

**BASE** was coined as a playful opposite of ACID to describe the early NoSQL philosophy:

- **Basically Available**: the system answers requests even during partial failures.
- **Soft state**: replicas may temporarily disagree.
- **Eventually consistent**: if writes stop, all replicas converge to the same value.

BASE systems push conflict handling to the application or to automated rules such as *last-write-wins* (by timestamp), which silently discards one of two concurrent writes. For a "last seen" timestamp that's fine. For a bank balance it is not.

### Where things stand in 2026

The sharp ACID-vs-BASE divide has mostly dissolved:

- **MongoDB**: single-document operations have always been atomic; multi-document ACID transactions since 4.0 (replica sets) and 4.2 (sharded clusters).
- **DynamoDB**: `TransactWriteItems` groups up to 100 actions (aggregate size up to 4 MB) atomically, across tables in the same account and Region. Transactions cost more capacity than plain writes.
- **Cassandra**: lightweight transactions give compare-and-set on a single partition; general multi-partition ACID transactions are still in development at the time of writing.
- **Redis**: `MULTI`/`EXEC` executes a block atomically (no other command interleaves) but does **not** roll back if one command fails at runtime. `WATCH` adds optimistic locking. Lua scripts and functions run atomically.
- **Distributed SQL** (Spanner, CockroachDB, YugabyteDB, TiDB, Aurora DSQL): full SQL transactions across shards and even regions, paying for it with consensus round-trips.

> **TIP:** Ask a sharper question than "is it ACID?". Ask: *atomic across what scope* (one record, one partition, many shards, many regions)? *Which isolation level* by default? *What happens on conflict* (abort and retry, last-write-wins, merge)?

## CAP, PACELC and consistency models

### CAP, stated properly

The CAP theorem (conjectured by Eric Brewer in 2000, proved by Gilbert and Lynch in 2002) says that a distributed data store cannot simultaneously guarantee all three of:

- **Consistency** (specifically *linearizability*): every read sees the most recent completed write, as if there were a single copy of the data.
- **Availability**: every request received by a non-failing node gets a (non-error) response.
- **Partition tolerance**: the system keeps operating even when the network drops or delays messages between nodes.

![CAP triangle on the left and the PACELC decision tree with example systems on the right](study/sql-vs-nosql/cap-pacelc.svg "CAP only describes behavior during a partition; PACELC adds the everyday latency trade-off")

The popular "pick two of three" framing is misleading. In any system that runs on more than one machine, network partitions *will* happen, so P is not optional. CAP really says: **when a partition happens, you must choose between consistency and availability** for the requests affected.

- A **CP** choice: the minority side of the partition refuses writes (or reads) rather than risk returning stale or conflicting data. Example: a Raft-based database where the side without a majority cannot elect a leader.
- An **AP** choice: every side keeps answering, and replicas may diverge until the partition heals, after which conflicts are reconciled.

Common misconceptions:

1. **"CA systems exist."** A single-node database is "CA" only in the trivial sense that it has no network to partition. Once you replicate, you are choosing CP or AP behavior during failures.
2. **"System X is CP" as a permanent label.** Most modern databases are tunable per request or per table. Cassandra at `QUORUM` behaves very differently from Cassandra at `ONE`. MongoDB's behavior depends on read and write concerns.
3. **"CP means the system is down during partitions."** Only the requests that cannot be served consistently are rejected; the majority side usually keeps working.
4. **"CAP consistency equals ACID consistency."** They are different concepts that share a letter.

### PACELC: the trade-off you pay every day

Partitions are rare. Latency is constant. Daniel Abadi's **PACELC** (2010, published 2012) extends CAP: *if there is a Partition, choose Availability or Consistency; Else (normal operation), choose Latency or Consistency.*

Why is there a latency/consistency trade-off without failures? Because keeping replicas strongly consistent requires coordination: a write must be acknowledged by a quorum, possibly in another region, before it is confirmed. Skipping that wait (acknowledging after one replica) is faster but lets readers see stale data.

- **PA/EL** (Cassandra, ScyllaDB and Dynamo-style systems at default settings): stay available, prefer low latency.
- **PC/EC** (Spanner, CockroachDB, YugabyteDB): always pay for consistency, including cross-region round-trips.
- Many systems let you choose per operation. DynamoDB reads are eventually consistent by default and strongly consistent if you ask (at twice the read cost); global tables can now be configured for multi-Region strong consistency, which gives up some write latency for a recovery point objective of zero.

### The consistency spectrum

"Strong vs eventual" is too coarse. From strongest to weakest, the models you will meet:

- **Strict serializability**: transactions appear to execute one at a time, in an order consistent with real time. (Spanner's "external consistency".)
- **Linearizability**: single-object operations appear instantaneous and in real-time order. What CAP's "C" means.
- **Sequential consistency**: all nodes see operations in the same order, but not necessarily real-time order.
- **Causal consistency**: if operation B depends on A (a reply to a comment), everyone sees A before B. Concurrent operations may appear in different orders. MongoDB offers causally consistent sessions.
- **Session guarantees**: *read-your-writes* (you always see your own updates), *monotonic reads* (you never go back in time), *monotonic writes*. These fix most user-visible weirdness cheaply.
- **Eventual consistency**: replicas converge if writes stop. No promise about *when*.

Quorum math lets you reason about overlap. With N replicas, writes acknowledged by W and reads querying R, if **R + W > N** every read overlaps at least one replica with the latest acknowledged write. With N=3, `QUORUM` writes (W=2) and `QUORUM` reads (R=2) give 2+2 > 3. (Even then, details like concurrent writes and clock-based conflict resolution mean this is not full linearizability.)

> **EXERCISE:** Your social app shows a user their own new post, then on refresh it disappears for two seconds, then reappears. Which consistency guarantee is missing, and name two ways to provide it. (Answer: read-your-writes. Route that user's reads to the primary/leader for a short time after they write, or use session tokens/causal sessions so a replica only serves them once it has caught up.)

## Scaling: vertical, replication, sharding

### Vertical first

**Vertical scaling** means a bigger machine: more CPU, RAM, faster disks. It is underrated. At the time of writing (2026), major clouds rent single instances with hundreds of vCPUs and multiple terabytes of RAM, and a well-indexed PostgreSQL or MySQL on modern NVMe storage can handle tens of thousands of transactions per second. Most applications never outgrow one well-tuned primary. Vertical scaling has a ceiling and a single point of failure, but its operational simplicity is worth a lot.

### Replication

**Replication** keeps copies of the same data on multiple nodes.

![Replication with a primary and replicas on the left, sharding with a router and three shards on the right](study/sql-vs-nosql/replication-sharding.svg "Replication copies all data to scale reads and survive failures; sharding splits data to scale writes and storage")

- **Single-leader** (Postgres, MySQL, MongoDB replica sets): one primary accepts writes and streams its log to replicas. Simple mental model. Replicas scale reads and provide failover. *Synchronous* replication waits for replica acknowledgment (safer, slower); *asynchronous* does not (faster, but a failover can lose the last few writes).
- **Multi-leader**: several nodes accept writes, typically one per region, and must resolve conflicts. Powerful for geo-distribution, painful when two regions edit the same record.
- **Leaderless** (Cassandra, ScyllaDB, the original Dynamo design): any replica accepts writes; quorums and background repair keep replicas converging.
- **Consensus-based** (Raft/Paxos in CockroachDB, Spanner, TiDB, etcd): each shard's replicas elect a leader and a write commits only when a majority agrees. This is how distributed SQL gets strong consistency.

Replication lag is the source of many "impossible" bugs. If your app writes to the primary and immediately reads from an async replica, the read can miss the write.

### Sharding (partitioning)

**Sharding** splits data so each node holds only part of it. This is how you scale *writes* and *storage* beyond one machine. Two main strategies:

- **Range partitioning**: keys A-H on shard 1, I-Q on shard 2... Great for range scans, but sequential keys (timestamps, auto-increment IDs) send all new writes to the last shard.
- **Hash partitioning**: `hash(key) mod ...` (in practice consistent hashing or many virtual partitions). Spreads load evenly, but a range scan must ask every shard.

Queries that include the shard key go to one shard. Queries that do not must **scatter-gather** across all of them, which gets slower and more expensive as you add shards. Cross-shard joins and transactions need coordination (two-phase commit or consensus), which is exactly what distributed SQL databases implement and what many NoSQL systems deliberately avoid.

In the relational world you can shard at the application level (Instagram and Notion famously did), use a sharding layer (Vitess for MySQL, Citus for PostgreSQL), or use a distributed SQL database that does it for you.

### Partition keys and hot partitions

The partition key is one of the most consequential decisions you will make, because it is very hard to change later. A good key has **high cardinality** (many distinct values) and **evenly distributed access**. A bad key concentrates traffic.

![Two bar charts: a date partition key sends all traffic to one throttled partition; a device id key spreads it evenly](study/sql-vs-nosql/hot-partition.svg "A hot partition: total capacity is fine, but one key receives all the traffic")

Concrete limits make this real. In DynamoDB, a single partition supports up to 3,000 read capacity units and 1,000 write capacity units per second (and roughly 10 GB of data before splitting). If you use `PK = event_date`, every write today hits one partition, and it will be throttled even if the table has plenty of total capacity. DynamoDB's adaptive capacity and split-for-heat help with uneven load, but they cannot split a *single* key's traffic.

Classic bad keys: dates, `status` (`PENDING` gets all the traffic), a tenant ID when one tenant is huge, a celebrity's user ID in a social feed. Fixes:

- Choose a naturally high-cardinality key (device ID, user ID, order ID).
- **Write sharding**: append a suffix, `2026-09-19#0` to `2026-09-19#9`, and fan reads out across the ten keys.
- Put a cache in front of hot reads.
- Special-case outliers (dedicated handling for the celebrity or the whale tenant).

> **WARNING:** Hot partitions often do not appear in testing because test data is uniform. They appear on launch day, during a sale, or when one big customer onboards. Load test with *realistic skew*.

## Designing for access patterns

Relational design starts with the **data**: normalize the entities, then write whatever queries you need. NoSQL design, especially for key-value and wide-column stores, starts with the **queries**: list every access pattern, then shape the data so each one is a cheap key lookup or a single-partition range read.

This inversion is the most important skill for using DynamoDB or Cassandra well. The canonical DynamoDB expression of it is **single-table design**: instead of one table per entity, store several entity types in one table, using generic key attributes (`PK`, `SK`) so that items you read together share a partition key.

![A DynamoDB table with customer, order, item and product records sharing PK and SK attributes, plus access patterns mapped to single queries](study/sql-vs-nosql/single-table.svg "Single-table design: the key structure is the query plan")

The process:

1. **List access patterns** with expected frequency and latency needs: "get customer profile and 10 latest orders" (very frequent), "get order items by order ID" (frequent), "orders by status for the warehouse" (moderate), "monthly revenue report" (rare, can be offline).
2. **Design primary keys** so the frequent patterns are single `Query` calls. `PK=CUST#c42`, `SK=ORDER#2026-09-01#1001` makes "latest orders" a sorted range read.
3. **Add global secondary indexes (GSIs)** for patterns with a different key. For "orders by status", project `GSI1PK=STATUS#PENDING`, `GSI1SK=2026-09-01T10:15:00Z` (and mind the hot-partition risk of a low-cardinality status key; you may need write sharding here too).
4. **Push everything else out**: analytics go to an export (for example to S3 and a query engine), search goes to a search engine.

Useful limits to design around (at the time of writing, 2026; check the AWS documentation for current values): items are at most 400 KB, a `Query` returns at most 1 MB per page before paginating, and transactions are limited to 100 items.

Single-table design is powerful but not mandatory. Even its advocates point out that when entities are rarely fetched together, separate tables are simpler to understand, monitor and evolve, and the AWS documentation presents both approaches. The principle that is not optional is the underlying one: **know your access patterns before you commit to keys.**

> **EXERCISE:** Add the access pattern "show all reviews for product KB-01, newest first, 20 per page" to the table above. What would PK and SK be? (One answer: `PK=PRODUCT#KB-01`, `SK=REVIEW#<timestamp>#<reviewId>`, queried with `begins_with(SK, 'REVIEW#')`, descending, limit 20. Watch out: a viral product may become a hot partition.)

The relational mirror image of this idea exists too: indexes, materialized views and denormalized read tables are all ways to shape storage for specific access patterns. The difference is that in SQL you can *start* without knowing them and optimize later, while in DynamoDB or Cassandra you must know them upfront or pay with scans and rewrites.

## Performance, operations and cost

### Performance is about access paths, not categories

A database is fast when a query touches little data in a predictable place. That is true for all models:

- A primary-key lookup in PostgreSQL on a warm cache takes well under a millisecond on the server; the same lookup in Redis is similar; DynamoDB is typically single-digit milliseconds plus network.
- A MongoDB query without a supporting index is a collection scan, just like an unindexed SQL query.
- A Cassandra query that hits one partition is fast; one that needs `ALLOW FILTERING` is a cluster scan.

The meaningful performance differences are structural: **LSM-tree** engines (Cassandra, ScyllaDB, RocksDB-based systems) turn writes into sequential appends and excel at write-heavy loads, paying with compaction work and read amplification. **B-tree** engines (Postgres, MySQL InnoDB, MongoDB's WiredTiger) favor balanced read/write loads. In-memory stores (Redis) trade cost and durability for latency. Distributed systems add network round-trips, and strongly consistent ones add consensus round-trips.

### Operational trade-offs

The cost of running a database is often larger than the cost of the database itself. Things to weigh:

- **Operational maturity of your team.** A Cassandra cluster needs someone who understands compaction strategies, repairs, tombstones and JVM or shard-per-core tuning. Self-hosted MongoDB sharding requires config servers and a good shard key. Postgres at scale requires vacuum tuning, connection pooling (PgBouncer) and replication management.
- **Managed services** (RDS/Aurora, Cloud SQL, Neon, Supabase, Atlas, DynamoDB, Astra, ScyllaDB Cloud, Upstash, Elastic Cloud) remove most of that toil, at a price, and with some lock-in.
- **Backups and point-in-time recovery**: test restores, not just backups.
- **Observability**: slow query logs, query plans, per-partition metrics.
- **Schema and data migrations**: how do you evolve data safely at your scale?
- **Ecosystem**: ORMs, BI tools, CDC connectors, hiring pool. SQL's ecosystem is unmatched.

### Cost

Pricing models differ in ways that change architecture decisions. At the time of writing (2026), broadly:

- **Provisioned instances** (RDS, self-hosted anything): you pay for capacity whether you use it or not. Cheap per operation at steady high load, wasteful for spiky or idle workloads.
- **Serverless / per-request** (DynamoDB on-demand, Aurora Serverless v2, Neon, Firestore): you pay per read/write unit or per compute second. Excellent for spiky or small workloads, can become expensive at sustained high throughput. DynamoDB, for example, charges per request unit, and strongly consistent reads and transactional writes consume more units than their default counterparts.
- **Memory-bound stores** (Redis) cost more per gigabyte than disk-based stores, so they are usually caches or small hot datasets rather than the system of record for large data.
- **Hidden costs**: cross-AZ and cross-region data transfer for replication, storage for indexes (every GSI is a copy), backups, and above all engineering time.

> **TIP:** Model cost with *your* numbers: reads/sec, writes/sec, item size, storage growth, peak-to-average ratio. A spreadsheet with three candidates at 1x, 10x and 100x your current load will tell you more than any benchmark blog post. Check each provider's current pricing page, because prices change.

## Polyglot persistence and CQRS

Real systems of any size end up using several data stores, each for what it does best. This is **polyglot persistence**. A typical 2026 e-commerce stack might use PostgreSQL for orders and payments, Redis for sessions and caching, OpenSearch for product search, a vector index for semantic search and recommendations, and a columnar warehouse such as ClickHouse, BigQuery or Snowflake for analytics.

![Architecture where a write API writes to PostgreSQL, CDC streams changes through Kafka into Redis, OpenSearch, a vector store and ClickHouse, and a read API queries those stores](study/sql-vs-nosql/polyglot-cqrs.svg "Polyglot persistence with CQRS: one source of truth, many read-optimized projections")

The danger is keeping many stores in sync. The naive approach, **dual writes** (the application writes to Postgres *and* to the search index), breaks when one write succeeds and the other fails, and it has race conditions when two updates interleave.

The robust approach combines two ideas:

- **CQRS (Command Query Responsibility Segregation)**: separate the model you write to (normalized, validated, transactional) from the models you read from (denormalized, query-shaped). They can be different tables in one database or entirely different databases.
- **Change data capture (CDC)** or the **transactional outbox**: the source of truth's changes are captured from its log (for example with Debezium reading the Postgres WAL) or written to an `outbox` table in the same transaction as the business change, then published to a stream such as Kafka. Consumers update each read store.

```sql
BEGIN;
INSERT INTO orders (id, customer_id, status) VALUES (1001, 'c42', 'PENDING');
INSERT INTO outbox (aggregate_id, event_type, payload)
VALUES (1001, 'OrderPlaced', '{"orderId":1001,"customerId":"c42","total":139.00}');
COMMIT;
-- a relay (or CDC on the outbox table) publishes the event; consumers
-- update the search index, the cache and the analytics store
```

The trade-off is that read models are **eventually consistent** with the source of truth, typically lagging by milliseconds to seconds. Design the UI for that (show the user their own write optimistically; don't make a critical decision based on the search index).

> **WARNING:** Every additional database is another thing to secure, back up, monitor, upgrade and understand at 3 a.m. Polyglot persistence should be earned by a real need, not adopted because a diagram looked good. Many teams go a long way with Postgres plus Redis.

## Comparison and decision framework

### The big comparison table

| | Relational | Document | Key-value | Wide-column | Graph | Distributed SQL |
|---|---|---|---|---|---|---|
| **Examples** | PostgreSQL, MySQL, SQL Server, Oracle | MongoDB, Couchbase, Firestore | Redis/Valkey, DynamoDB, etcd | Cassandra, ScyllaDB, Bigtable, HBase | Neo4j, Neptune, Memgraph | Spanner, CockroachDB, YugabyteDB, TiDB, Aurora DSQL |
| **Data shape** | Normalized tables | Nested JSON-like documents | Opaque or simple-typed values by key | Partitions of sorted rows | Nodes and relationships | Tables |
| **Schema** | On write (JSON columns for flexibility) | On read, optional validation | None (app-defined) | Declared tables, query-first | Flexible labels/properties | On write |
| **Query power** | Very high: joins, aggregates, window functions, ad-hoc | High within a collection; `$lookup` for joins | Key lookups, some structure ops | Partition-key queries only (plus SAI) | Multi-hop traversal, pattern matching | High SQL, some limits vs single-node |
| **Transactions** | Full ACID, configurable isolation | Single-doc atomic; multi-doc ACID since 4.0/4.2 | Varies: Redis `MULTI`, DynamoDB up to 100 items | Single-partition LWT; multi-partition in development | ACID (Neo4j) | Distributed ACID, often serializable |
| **Scaling model** | Vertical + read replicas; sharding via Citus/Vitess/app | Built-in sharding | Built-in partitioning (DynamoDB), cluster mode (Redis) | Linear horizontal, multi-DC native | Mostly vertical + replicas | Automatic sharding + consensus replication |
| **Consistency default** | Strong on primary; replicas async | Strong on primary; tunable | Redis: async replicas; DynamoDB: eventual reads by default | Tunable per query | Strong (single leader) | Strong |
| **Sweet spot** | Systems of record, business logic, reporting | Content, catalogs, user profiles, evolving aggregates | Caching, sessions, counters, huge simple lookups | Time-ordered firehoses: messages, IoT, events | Recommendations, fraud, identity, networks | Relational workloads that outgrow one node or need multi-region |
| **Weak spot** | Write scale-out, massive schema churn | Cross-aggregate relationships and reporting | Anything not by key | Ad-hoc queries, updates/deletes-heavy data | Whole-graph aggregates, sharding | Latency per write, cost, operational complexity |
| **Ops difficulty** | Low to medium | Medium | Low (managed) to medium | High self-hosted | Medium | Medium to high (managed eases it) |

### A decision framework

No flowchart replaces thinking, but a good sequence of questions helps you avoid the common mistakes. Ask them in order; the first "yes" gives you a strong candidate.

![Flowchart of six yes/no questions leading to relational, key-value, wide-column, graph, specialized or document databases, defaulting to PostgreSQL](study/sql-vs-nosql/decision-flowchart.svg "A first-pass decision flow: the first yes is your leading candidate, not a final verdict")

Then stress-test the candidate with these questions:

1. **Invariants.** What must never be wrong? Money, inventory, bookings, permissions. Those want ACID transactions and constraints in the store of record.
2. **Access patterns.** Do you know them, and are they stable? Unknown or evolving queries favor SQL. Known, high-volume, key-based patterns favor KV or wide-column.
3. **Shape and relationships.** Mostly independent aggregates (document)? Densely connected with multi-hop questions (graph)? Many-to-many business entities (relational)?
4. **Scale, honestly measured.** Current and 3-year projected data size, reads/sec, writes/sec, peak ratio. Most "we need NoSQL for scale" projects are under 1 TB and a few thousand writes per second, well within one relational node.
5. **Geography and availability.** Multi-region writes? Required RPO/RTO? This is where Cassandra, DynamoDB global tables and distributed SQL earn their keep.
6. **Latency budget.** Sub-millisecond reads suggest a cache or in-memory store in front of whatever holds the truth.
7. **Team and operations.** What does your team already run well? What will you be able to debug at 3 a.m.?
8. **Cost and lock-in.** Per-request vs provisioned pricing at 1x/10x/100x load; how hard is it to leave?

> **TIP:** A sound default for a new product in 2026: **PostgreSQL** (managed) as the system of record, `jsonb` for flexible attributes, `pgvector` for semantic search, Redis/Valkey for caching. Split out a specialized store only when you can name the workload that the default handles badly, and measure it.

## Case studies and myths

The following are well-known public engineering stories. Details come from the companies' own published write-ups at the time; architectures change, so treat them as snapshots of reasoning rather than current blueprints.

### Case studies

**Amazon: Dynamo and DynamoDB.** Amazon's 2007 Dynamo paper came from outages during peak shopping periods; the shopping cart had to accept writes even when parts of the system failed, so they chose availability and eventual consistency with application-level conflict resolution. Its descendant, DynamoDB, is now a core service: AWS reported that during Prime Day 2025, DynamoDB peaked at 151 million requests per second while maintaining single-digit millisecond latency. Amazon's consumer business also publicly completed a migration off Oracle in 2019, moving thousands of databases to a mix of DynamoDB, Aurora and other AWS services, choosing per workload rather than one-size-fits-all.

**Discord: MongoDB to Cassandra to ScyllaDB.** Discord wrote in 2017 that it moved message storage from MongoDB to Cassandra once the data and index no longer fit in memory, modeling messages by channel and time bucket to keep partitions bounded. In 2023 it described migrating trillions of messages to ScyllaDB, reducing the cluster from 177 Cassandra nodes to 72 ScyllaDB nodes with substantially lower tail latencies. Lessons: the model (partition by channel plus time bucket) mattered as much as the engine, and hot partitions from very busy channels drove much of the design, including a request-coalescing data service in front of the database.

**Instagram and Notion: sharded PostgreSQL.** Instagram described (2012) sharding PostgreSQL into thousands of *logical* shards mapped onto fewer physical servers, with IDs that embed the shard number. Notion described (2021) splitting its monolithic Postgres into 480 logical shards across 32 physical databases, partitioned by workspace ID, and later expanding the physical fleet. Lesson: relational databases scale horizontally when you choose a good tenant-aligned shard key, and logical shards make later rebalancing much easier.

**Figma: horizontally sharding Postgres (2024).** Figma wrote about moving from vertical partitioning (separate databases per group of tables) to horizontal sharding of Postgres, building a proxy layer that routes queries by shard key, rather than migrating to a NoSQL or distributed SQL system. Their stated reasoning included keeping Postgres's reliability characteristics and their team's existing expertise.

**Uber: Schemaless on MySQL.** Uber described (2016) building "Schemaless", an append-only, sharded key-value datastore layered on top of MySQL, and separately explained migrating core data from PostgreSQL to MySQL for replication and upgrade reasons specific to their workload. Lesson: the line between "SQL" and "NoSQL" is often an API layer, and a relational engine can be the storage underneath a key-value abstraction.

### Myths

**"NoSQL is faster."** Faster at what? A key lookup in DynamoDB is fast; so is a primary-key lookup in Postgres. NoSQL systems are fast *on the access patterns they were designed for*, often because they forbid the slow operations (joins, ad-hoc filters). Put an unindexed query or a scatter-gather on MongoDB or Cassandra and it is slow too. Benchmark your workload, not a vendor's.

**"SQL doesn't scale."** Spanner, CockroachDB, YugabyteDB, TiDB, Vitess (behind large MySQL deployments) and Citus scale SQL horizontally, and single-node Postgres/MySQL handle far more than most applications need. What is true: classic single-primary relational databases don't scale *writes* horizontally without extra machinery.

**"Schemaless means no schema."** It means the database doesn't *enforce* the schema. Your data still has one, it is just implicit, spread across your code and every historical version of it.

**"NoSQL means no transactions."** Outdated since at least 2018. MongoDB, DynamoDB, Neo4j and others offer ACID transactions with various scopes.

**"CAP means pick two."** You don't get to "pick" giving up partition tolerance; you choose behavior *during* a partition, and PACELC reminds you of the latency trade-off the rest of the time.

**"We'll need to scale, so let's start with NoSQL."** Premature scaling is premature optimization with a longer tail. Starting with a flexible relational store and splitting later is usually cheaper than contorting early product development around a query-first data model you will have to change as the product changes.

**"Postgres can do everything, so we never need anything else."** The counter-myth. Postgres can do a remarkable amount, but a 50 TB write-heavy telemetry firehose across three continents, sub-millisecond caching at millions of ops/sec, or deep graph traversals over billions of edges are real cases where specialized systems win clearly.

## Migration considerations

At some point you may need to move data between databases: SQL to NoSQL, NoSQL to SQL, or one engine to another. Migrations fail far more often from process mistakes than from technology choices.

**1. Migrate the model, not just the data.** Moving from SQL to DynamoDB or Cassandra means redesigning around access patterns; copying tables one-to-one produces the worst of both worlds. Moving from MongoDB to Postgres means deciding which fields become columns and which stay `jsonb`, and cleaning up years of schema drift.

**2. Inventory access patterns and invariants first.** Instrument the current system: which queries run, how often, with what latency. List the invariants the old database enforced implicitly (unique emails, foreign keys, atomic updates) that the new one must handle differently.

**3. Use a phased, reversible approach:**

```text
Phase 1  Backfill       bulk-copy historical data to the new store (idempotent, resumable)
Phase 2  Sync           capture ongoing changes with CDC (or dual writes, with care)
Phase 3  Shadow reads   read from both, serve the old result, log mismatches
Phase 4  Cut over reads switch read traffic gradually (1% -> 10% -> 100%), with a kill switch
Phase 5  Cut over writes make the new store the source of truth; keep the old one in sync
Phase 6  Decommission   only after a quiet period and a tested rollback window has passed
```

**4. Validate continuously.** Row counts are not enough; compare checksums or sampled records field by field, especially for money, timestamps (time zones!) and decimals (floating-point vs decimal types differ between systems).

**5. Mind semantics that don't translate:**

- Transactions and isolation levels (a multi-table SQL transaction may become a DynamoDB `TransactWriteItems`, or may need to become an idempotent, retryable workflow).
- Auto-increment IDs vs distributed IDs (UUIDv7, Snowflake-style IDs).
- Sorting and collation, null handling, case sensitivity.
- Secondary indexes that were free in one system and cost extra copies in another.
- TTLs, triggers, cascading deletes, and constraints that silently enforced business rules.

**6. Rehearse with production-scale data and production-like skew.** Discord-style migrations of billions of records are measured in days or weeks of copy time. Estimate throughput early, and plan for throttling so the migration does not overwhelm the live system.

> **WARNING:** The most dangerous phase is the one where both systems accept writes. Have a single, clearly defined source of truth at every moment, and make every write idempotent so replays are safe.

## Cheat sheet

- **NoSQL is not one thing**: document, key-value, wide-column and graph have different strengths. Add time-series, search and vector as specialized families.
- **Relational** = normalized tables, joins, constraints, ACID, ad-hoc queries. Default choice for systems of record.
- **Document** = store aggregates together; embed what you read together, reference what is shared or unbounded. MongoDB docs max 16 MB; multi-doc ACID since 4.0 (4.2 for shards).
- **Key-value** = get/put by key, extreme speed and scale, no ad-hoc queries. Redis/Valkey in memory; DynamoDB items max 400 KB, transactions up to 100 items.
- **Wide-column** = partition key decides placement, clustering columns decide order; one table per query; duplication is expected. Tunable consistency.
- **Graph** = relationships are stored; multi-hop traversals are cheap. Cypher; GQL is now an ISO standard.
- **Schemaless** = schema-on-read. The schema still exists; your code enforces it. Use validation where it matters.
- **ACID**: ask *scope* (record, partition, shard, region), *isolation level*, *conflict behavior*. Default isolation is usually read committed or snapshot, not serializable.
- **CAP**: during a partition, choose C or A. "CA" is not a real distributed option. **PACELC**: else, choose latency or consistency.
- **Consistency**: strict serializable > linearizable > sequential > causal > session guarantees > eventual. Quorums overlap when R + W > N.
- **Scale in order**: optimize queries and indexes, scale vertically, add read replicas and caching, then shard (or go distributed SQL / NoSQL).
- **Partition keys**: high cardinality, even access. Dates, statuses and whales create hot partitions. Fix with better keys, write sharding, caching.
- **Access-pattern-first** design for DynamoDB/Cassandra: list queries, design keys, add GSIs, push analytics elsewhere.
- **Polyglot** only when earned; sync stores via CDC or the outbox pattern, not naive dual writes. Read models are eventually consistent.
- **Default in 2026**: managed PostgreSQL + `jsonb` + `pgvector`, plus Redis/Valkey for cache. Specialize when a measured workload demands it.
- **Migrations**: backfill, CDC sync, shadow reads, gradual cutover, validation, rollback plan. One source of truth at all times.

## Where to go next

- **Designing Data-Intensive Applications** by Martin Kleppmann and Chris Riccomini (second edition, O'Reilly, 2026). The single best book on data models, replication, partitioning, transactions and consistency; if you read nothing else, read those chapters.
- **The original papers**: Codd (1970), Bigtable (2006), Dynamo (2007), Spanner (2012), and Abadi's "Consistency Tradeoffs in Modern Distributed Database System Design" (2012) for PACELC. Brewer's "CAP Twelve Years Later" (2012) is a short, clarifying read.
- **Jepsen analyses** (jepsen.io): independent tests of what distributed databases actually guarantee under failure. Humbling and educational.
- **The DynamoDB Book** by Alex DeBrie and the AWS DynamoDB developer guide sections on data modeling and partition key design.
- **Official docs worth reading end to end**: the PostgreSQL manual chapters on concurrency control (MVCC and isolation) and JSON types; MongoDB's data modeling and transactions guides; the Cassandra data modeling docs; Neo4j's Cypher manual.
- **Engineering blogs** from Discord, Notion, Figma, Instagram, Uber and AWS (search for the posts cited above) for real-world trade-offs.
- **Practice**: take one small app idea and model it three ways: Postgres, MongoDB and DynamoDB single-table. Write down every access pattern first, then implement the five most important queries in each. You will learn more from that afternoon than from any comparison chart, including the one in this article.
