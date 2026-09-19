Software architecture is not a job title you get handed one day. It is a way of thinking that you grow into, one altitude at a time. As a junior you look at a function and ask "is this clear?". A few years later you look at a whole application and ask "where should this rule live?". Later still you look at a fleet of services and ask "what happens when this one is down?". Eventually you look at an organisation and ask "which of these decisions will we regret in three years, and who needs to agree before we make them?".

This guide follows that climb. Each stage adds a new altitude of thinking on top of the previous one - it never replaces it. You will get concrete examples (TypeScript and a bit of C#), diagrams, exercises for every stage, a worked system-design problem with real numbers, and a sample Architecture Decision Record you can steal.

The one idea to carry through the whole article: **architecture is the set of decisions that are expensive to change.** Everything else is just design. Your job at every level is to recognise which decisions are expensive, make them deliberately, and keep the cheap ones cheap.

## The altitude model

Think of architectural thinking as flying over the same landscape at different heights: trees (functions and classes), then fields and roads (modules and layers), then towns and highways (services and data flows), and finally the whole region with its weather and road-building budget (strategy, teams, cost, risk).

![Four stacked altitude levels from code to strategy, each labelled with its core question and typical artefacts](study/software-architecture-junior-to-architect/career-ladder.svg "Figure 1. The altitude model: each career stage adds a higher zoom level without dropping the lower ones")

| Stage | Altitude | Core question | Typical artefacts | Blast radius of a mistake |
|---|---|---|---|---|
| Junior | Code | Is this function/class clear and correct? | Functions, classes, unit tests | A bug, a messy file |
| Mid-level | Application | Where does this responsibility belong? | Modules, layers, APIs, domain model | A hard-to-change codebase |
| Senior | System | How do these parts behave together under load and failure? | Services, queues, databases, SLOs | Outages, data loss |
| Staff / Architect | Organisation | Which decisions matter, who owns them, what do they cost? | ADRs, context maps, roadmaps, fitness functions | Years of wasted effort |

Two things to notice. First, the blast radius grows with altitude: a bad variable name costs minutes, a bad service boundary costs quarters. Second, the feedback loop gets slower: you know within seconds whether a function works, but you may not know for a year whether a microservice split was a good idea. That slow feedback is exactly why higher-altitude work needs more deliberate reasoning, written records, and explicit trade-offs.

> **NOTE:** Titles vary wildly between companies. "Senior" at a 20-person startup may do what a "Staff" engineer does at a big tech company. Use the stages here as altitudes of thinking, not as HR levels.

## Stage 1 - Junior: design in the small

At this altitude your unit of design is the function and the class. The goal is code that a colleague can read once, understand, and change safely. Everything above this level depends on it: you cannot build a clean architecture out of confusing parts.

### Names and functions

Naming is design. A good name tells you *what* and *why*, so the reader never has to read the body to know what a function does.

```ts
// Before: what is d? what does process mean? what is 30?
function process(d: any[]) {
  return d.filter(x => x.t > Date.now() - 30 * 86400000);
}

// After: the name answers "what", the constant answers "why 30"
const RECENT_ORDER_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function recentOrders(orders: Order[], now = Date.now()): Order[] {
  const cutoff = now - RECENT_ORDER_WINDOW_DAYS * MS_PER_DAY;
  return orders.filter(order => order.placedAt > cutoff);
}
```

Notice the small architectural decision hiding in there: `now` is a parameter with a default. That single choice makes the function deterministic and testable. Good design at this level is mostly a collection of such tiny, deliberate choices.

Rules of thumb that hold up in practice:

- **One level of abstraction per function.** Don't mix "calculate the invoice total" with "format a currency string" and "write to the database" in one body.
- **Functions do one thing** - which in practice means you can describe them in one sentence without "and".
- **Prefer pure functions** (same input, same output, no side effects) for business logic. Push I/O to the edges.
- **Make illegal states unrepresentable.** A `status: 'draft' | 'sent' | 'paid'` union beats a free-form string plus three booleans.

### Cohesion and coupling

These two words are the oldest and most useful ideas in software design (Larry Constantine, 1970s), and almost every principle later in this article is a special case of them.

- **Cohesion** - how strongly the things *inside* a module belong together. High cohesion: everything in `InvoiceCalculator` is about calculating invoices.
- **Coupling** - how strongly a module *depends on* others. Low coupling: you can change `InvoiceCalculator` without touching the email module.

You want **high cohesion, low coupling**. Things that change together should live together; things that change for different reasons should be separated and talk through narrow interfaces.

![Left side shows tangled modules with many cross dependencies; right side shows cohesive modules connected by a few narrow interfaces](study/software-architecture-junior-to-architect/coupling-cohesion.svg "Figure 2. Low cohesion and high coupling (left) versus high cohesion and low coupling (right)")

Not all coupling is equal. The worst is *content coupling* (reaching into another module's internals), then shared global state, then *control coupling* (passing flags like `save(order, true, false)` that tell the other side what to do). The best is *data coupling*: passing exactly the simple data needed. You'll meet the same ladder at system level, where "reaching into another module's internals" becomes "reading another service's database".

### SOLID with small examples

SOLID (collected by Robert C. Martin) is five heuristics for object-oriented design. They are not laws; they are ways of getting high cohesion and low coupling.

**S - Single Responsibility Principle.** A module should have one reason to change, meaning one *actor* who would ask for the change.

```ts
// Two actors: finance changes pricing, marketing changes the email.
class OrderService {
  total(order: Order): Money { /* pricing rules */ }
  sendConfirmation(order: Order): void { /* email template */ }
}

// Split by reason to change.
class OrderPricing { total(order: Order): Money { /* ... */ } }
class OrderNotifications { sendConfirmation(order: Order): void { /* ... */ } }
```

**O - Open/Closed Principle.** Open for extension, closed for modification. Add behaviour by adding code, not by editing a growing `switch`.

```ts
interface DiscountRule { apply(order: Order): Money; }

class BlackFridayDiscount implements DiscountRule { /* ... */ }
class LoyaltyDiscount implements DiscountRule { /* ... */ }

class Checkout {
  constructor(private readonly rules: DiscountRule[]) {}
  discount(order: Order): Money {
    return this.rules.reduce((sum, r) => sum.add(r.apply(order)), Money.zero());
  }
}
// A new promotion is a new class; Checkout does not change.
```

**L - Liskov Substitution Principle.** A subtype must be usable anywhere its parent is, without surprises. The classic violation is `Square extends Rectangle`: setting width on a square secretly changes height, which breaks code that expected a rectangle. If a subclass has to throw `NotSupportedException` for an inherited method, you are violating LSP - the inheritance is lying.

**I - Interface Segregation Principle.** Clients should not depend on methods they don't use.

```csharp
// Fat interface: a read-only report is forced to know about Delete.
public interface IRepository<T> {
    T Get(Guid id); IEnumerable<T> List(); void Save(T item); void Delete(Guid id);
}

// Segregated: each client depends on the smallest useful surface.
public interface IReader<T> { T Get(Guid id); IEnumerable<T> List(); }
public interface IWriter<T> { void Save(T item); void Delete(Guid id); }
```

**D - Dependency Inversion Principle.** High-level policy should not depend on low-level details; both should depend on abstractions, and **the abstraction belongs to the high-level side**.

```ts
// The domain declares what it needs...
export interface PaymentGateway {
  charge(customerId: string, amount: Money): Promise<ChargeResult>;
}

// ...and infrastructure implements it.
export class StripePaymentGateway implements PaymentGateway { /* SDK calls */ }
```

DIP is the single most important principle for the next stage. Clean, hexagonal and onion architectures are essentially DIP applied to an entire application.

### DRY, KISS, YAGNI - and when to ignore them

- **DRY (Don't Repeat Yourself)** is about *knowledge*, not about text. Two functions that look identical but encode different business rules (say, "shipping tax" and "import tax" that happen to both be 20% today) should stay separate. Merging them couples two things that will diverge. A useful counter-slogan: prefer duplication over the wrong abstraction.
- **KISS (Keep It Simple)** - the simplest thing that clearly works. Cleverness is a cost you pay every time someone reads the code.
- **YAGNI (You Aren't Gonna Need It)** - don't build for hypothetical future requirements. Build the seam (an interface, a clean boundary) if it's cheap; don't build the plugin framework.

The tension between these is where judgement lives. The **rule of three** is a practical compromise: tolerate duplication twice, abstract on the third occurrence, when you finally know what actually varies.

### Composition over inheritance

Inheritance couples a child to every implementation detail of its parent - the tightest coupling available in most languages. Composition lets you assemble behaviour from small parts and swap them at runtime.

```ts
// Inheritance explosion: EmailNotifier, SmsNotifier, RetryingEmailNotifier,
// RetryingSmsNotifier, LoggingRetryingEmailNotifier...

// Composition: one interface, small pieces, combine as needed.
interface Notifier { send(to: string, msg: string): Promise<void>; }

class EmailNotifier implements Notifier { async send(to: string, msg: string) { /* ... */ } }

class RetryingNotifier implements Notifier {
  constructor(private inner: Notifier, private attempts = 3) {}
  async send(to: string, msg: string) {
    for (let i = 1; ; i++) {
      try { return await this.inner.send(to, msg); }
      catch (e) { if (i >= this.attempts) throw e; }
    }
  }
}

const notifier = new RetryingNotifier(new EmailNotifier());
```

Use inheritance for genuine "is-a" relationships with a stable parent (framework base classes, sealed type hierarchies). Reach for composition by default.

### Five design patterns that actually matter

The Gang of Four book lists 23 patterns. You will use a handful weekly. Learn these five deeply; recognise the rest when you see them.

**Strategy** - swap an algorithm behind an interface. You already saw it: `DiscountRule` is a strategy. In TypeScript a strategy is often just a function type.

```ts
type ShippingCost = (weightKg: number) => number;
const standard: ShippingCost = w => 4.99 + w * 0.5;
const express: ShippingCost = w => 9.99 + w * 1.2;

function quote(weightKg: number, strategy: ShippingCost) { return strategy(weightKg); }
```

**Factory** - centralise the decision of *which* concrete class to create, so callers depend only on the interface.

```ts
function createStorage(config: AppConfig): FileStorage {
  switch (config.storage.kind) {
    case 's3':    return new S3Storage(config.storage.bucket);
    case 'azure': return new AzureBlobStorage(config.storage.container);
    case 'local': return new LocalDiskStorage(config.storage.path);
  }
}
```

**Adapter** - wrap an incompatible interface so it fits the one your code expects. This is the pattern behind every "anti-corruption layer" you will meet later.

```ts
// Legacy SDK speaks cents and callbacks; our domain speaks Money and promises.
class LegacyBillingAdapter implements PaymentGateway {
  constructor(private legacy: LegacyBillingClient) {}
  charge(customerId: string, amount: Money): Promise<ChargeResult> {
    return new Promise((resolve, reject) =>
      this.legacy.bill(customerId, amount.toCents(), (err, res) =>
        err ? reject(err) : resolve({ id: res.txn, ok: res.code === 0 })));
  }
}
```

**Observer** - let subjects notify subscribers without knowing who they are. RxJS observables, DOM events and domain events are all Observer. At the system level it grows up into publish/subscribe messaging.

```ts
type Listener<T> = (event: T) => void;

class EventBus<T> {
  private listeners: Listener<T>[] = [];
  subscribe(l: Listener<T>) { this.listeners.push(l); return () => this.unsubscribe(l); }
  unsubscribe(l: Listener<T>) { this.listeners = this.listeners.filter(x => x !== l); }
  publish(event: T) { this.listeners.forEach(l => l(event)); }
}
```

**Decorator** - add behaviour by wrapping an object with the same interface. `RetryingNotifier` above is a decorator. So are caching repositories, logging wrappers and HTTP middleware. Decorators are how you add cross-cutting concerns without touching business code.

> **TIP:** Patterns are a vocabulary, not a goal. "Let's put a decorator around the repository for caching" is a whole design conversation in one sentence. Code that uses six patterns to print "hello" is not well designed.

### The testing pyramid

Testability is a design property. If something is hard to test, it is usually too coupled. The testing pyramid (popularised by Mike Cohn) says: many fast unit tests, fewer integration tests, very few end-to-end tests.

| Layer | What it checks | Speed | Typical share |
|---|---|---|---|
| Unit | One function/class, dependencies faked | Milliseconds | Most tests |
| Integration | Your code plus a real DB, queue, or HTTP boundary | Seconds | A solid middle |
| End-to-end | The whole system through the UI or public API | Seconds to minutes | A few critical journeys |

Variants like the "testing trophy" weight integration tests more, which suits glue-heavy apps (tools like Testcontainers make real-database tests cheap). The principle is the same: maximum confidence at minimum cost.

```ts
// Because recentOrders takes `now`, the test is trivial and deterministic.
it('keeps only orders from the last 30 days', () => {
  const now = Date.UTC(2026, 8, 19);
  const old = { placedAt: now - 31 * MS_PER_DAY } as Order;
  const fresh = { placedAt: now - 1 * MS_PER_DAY } as Order;
  expect(recentOrders([old, fresh], now)).toEqual([fresh]);
});
```

> **EXERCISE:** Take a 100+ line function from a project you know. (1) List every reason it might change and who would ask. (2) Split it by those reasons. (3) Replace one `if/else` chain with a Strategy. (4) Write unit tests for the pure parts. Measure: how many lines did each new function end up with, and how many mocks did the tests need? Lots of mocks means lots of coupling.

### Signals you're ready for the next level

- Your code reviews comment on *design* (responsibilities, naming, coupling), not just style and bugs.
- You can explain *why* a principle applies, and name a case where it doesn't.
- You notice when a change touches many files and ask why.
- You refactor in small, safe steps and leave code better than you found it.

## Stage 2 - Mid-level: designing an application

Now zoom out. The question is no longer "is this class clean?" but "where does this responsibility belong in the application, and which way do the dependencies point?". Mid-level engineers own features end to end and start shaping the internal structure of a whole codebase.

### Layered architecture

The classic starting point: split the application into horizontal layers, each depending only on the one below.

```text
Presentation   (controllers, UI, DTOs)
     |
Application    (use cases, orchestration, transactions)
     |
Domain         (business rules, entities)
     |
Infrastructure (database, email, file storage, external APIs)
```

Layers are easy to understand and every framework supports them. Their weakness is the direction of that last arrow: in a naive layered design the domain depends on infrastructure, so your business rules import your ORM. Change the database and you touch the heart of the system. Tests for business rules need a database. That is exactly the coupling DIP warns against.

Watch for the **anemic domain model** (entities are bags of getters and setters while all logic lives in huge "service" classes) and the **sinkhole** (most requests pass through every layer untouched, just being mapped from DTO to DTO).

### Dependency inversion at application scale

Flip the arrow. Let the domain and application layers *define* the interfaces they need (`OrderRepository`, `PaymentGateway`, `Clock`), and let infrastructure implement them. Now the dependency points **inward**, toward business logic, and the domain has zero imports from frameworks or drivers.

This one move is the shared core of three famous styles that are more alike than different:

- **Hexagonal architecture / Ports and Adapters** (Alistair Cockburn, 2005): the app has *ports* (interfaces) and the outside world connects through *adapters*.
- **Onion architecture** (Jeffrey Palermo, 2008): concentric rings, domain in the middle, dependencies point inward.
- **Clean Architecture** (Robert C. Martin, 2012): entities, use cases, interface adapters, frameworks - same Dependency Rule.

![Side by side comparison: a vertical layered stack with dependencies pointing down to the database, and a hexagon with the domain in the centre, ports on its edge, and adapters outside pointing inward](study/software-architecture-junior-to-architect/layered-vs-hexagonal.svg "Figure 3. Layered architecture (dependencies flow down to infrastructure) versus hexagonal architecture (dependencies flow inward to the domain)")

### Ports and adapters: a concrete example

Suppose you're building "place an order". Here's a minimal hexagonal slice in TypeScript.

```ts
// ---- domain/order.ts (no imports from frameworks) ----
export class Order {
  private constructor(
    readonly id: string,
    readonly customerId: string,
    private lines: OrderLine[],
    private status: 'pending' | 'placed' = 'pending',
  ) {}

  static create(id: string, customerId: string, lines: OrderLine[]): Order {
    if (lines.length === 0) throw new Error('An order needs at least one line');
    return new Order(id, customerId, lines);
  }

  total(): Money { return this.lines.reduce((s, l) => s.add(l.subtotal()), Money.zero()); }
  markPlaced() { this.status = 'placed'; }
}

// ---- application/ports.ts (driven ports: what the app needs) ----
export interface OrderRepository { save(order: Order): Promise<void>; }
export interface PaymentGateway { charge(customerId: string, amount: Money): Promise<{ ok: boolean }>; }
export interface IdGenerator { next(): string; }

// ---- application/place-order.ts (driving port: what the app offers) ----
export class PlaceOrder {
  constructor(
    private orders: OrderRepository,
    private payments: PaymentGateway,
    private ids: IdGenerator,
  ) {}

  async execute(cmd: { customerId: string; lines: OrderLine[] }): Promise<string> {
    const order = Order.create(this.ids.next(), cmd.customerId, cmd.lines);
    const result = await this.payments.charge(order.customerId, order.total());
    if (!result.ok) throw new PaymentDeclined(order.id);
    order.markPlaced();
    await this.orders.save(order);
    return order.id;
  }
}

// ---- adapters/postgres-order-repository.ts (driven adapter) ----
export class PostgresOrderRepository implements OrderRepository {
  constructor(private db: Pool) {}
  async save(order: Order) { /* INSERT ... ON CONFLICT ... */ }
}

// ---- adapters/http/orders-controller.ts (driving adapter) ----
app.post('/orders', async (req, res) => {
  const id = await placeOrder.execute(req.body);
  res.status(201).location(`/orders/${id}`).send();
});

// ---- main.ts (composition root: the only place that knows everything) ----
const placeOrder = new PlaceOrder(
  new PostgresOrderRepository(pool),
  new StripePaymentGateway(process.env.STRIPE_KEY!),
  new UuidGenerator(),
);
```

You gain testability (`PlaceOrder` runs against in-memory fakes in milliseconds), replaceability (a new payment provider is a new adapter, not surgery), and multiple entry points for free (HTTP, CLI, queue consumer, test). You pay with more files, more interfaces and some mapping between domain and persistence models. For a CRUD admin panel that cost may not be worth it; for a core domain with rules that matter, it almost always is.

> **WARNING:** Hexagonal architecture does not mean "wrap every library in an interface". Put ports where you have a real reason: an external system you don't control, something slow or non-deterministic (time, randomness, network), or something you genuinely might replace.

### Vertical slice architecture

Layered and hexagonal designs organise code *horizontally* by technical role. **Vertical slice architecture** (popularised by Jimmy Bogard) organises it by *feature*: each request or use case gets its own folder with its handler, validation, data access and tests.

```text
features/
  place-order/
    place-order.endpoint.ts
    place-order.handler.ts
    place-order.validator.ts
    place-order.test.ts
  cancel-order/
    ...
  get-order-history/
    get-order-history.query.ts   # may go straight to SQL, no domain model needed
```

The insight is cohesion: code that changes together (everything for one feature) lives together, and each slice picks its own sophistication - a rich domain model for complex rules, a single SQL query for a simple read. Slices and hexagonal architecture combine well: organise by feature, share a domain model for the genuinely complex rules, and keep infrastructure behind ports where it matters.

### DDD tactical patterns

Domain-Driven Design (Eric Evans, 2003) has two halves. The *strategic* half (bounded contexts) is for later. The *tactical* half gives you building blocks for rich domain models:

| Pattern | What it is | Example |
|---|---|---|
| **Entity** | Has an identity that persists as its attributes change | `Customer` with id `c-42` |
| **Value object** | Defined only by its values, immutable, compared by value | `Money(100, 'EUR')`, `EmailAddress`, `DateRange` |
| **Aggregate** | A cluster of objects treated as one consistency unit, accessed through a root | `Order` (root) with its `OrderLine`s |
| **Repository** | Collection-like access to aggregates, hiding persistence | `orders.get(id)`, `orders.save(order)` |
| **Domain event** | Something that happened that domain experts care about | `OrderPlaced`, `PaymentFailed` |
| **Domain service** | Domain logic that doesn't naturally belong to one entity | `TransferFunds` between two accounts |

Value objects are the cheapest win in all of DDD. They kill "primitive obsession" and put validation in one place:

```ts
export class Money {
  private constructor(readonly amountMinor: number, readonly currency: 'EUR' | 'USD') {
    if (!Number.isInteger(amountMinor)) throw new Error('Money is stored in minor units');
  }
  static of(amountMinor: number, currency: 'EUR' | 'USD') { return new Money(amountMinor, currency); }
  static zero(currency: 'EUR' | 'USD' = 'EUR') { return new Money(0, currency); }
  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('Currency mismatch');
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }
  equals(other: Money) { return this.amountMinor === other.amountMinor && this.currency === other.currency; }
}
```

Aggregates are where the real design work happens. Vaughn Vernon's rules of thumb: protect true invariants inside the boundary, keep aggregates small, reference other aggregates by id, and **update one aggregate per transaction**, using domain events to update the others. That last rule is the bridge to the next stage: once "update other aggregates via events" feels natural, "update other services via events" is a small step.

```ts
// The aggregate records events; the application layer publishes them after saving.
class Order {
  private events: DomainEvent[] = [];
  place() {
    if (this.status !== 'pending') throw new Error('Order already placed');
    this.status = 'placed';
    this.events.push({ type: 'OrderPlaced', orderId: this.id, total: this.total(), at: new Date() });
  }
  pullEvents(): DomainEvent[] { const e = this.events; this.events = []; return e; }
}
```

### API design

Your API is the most expensive thing to change in your application, because other people's code depends on it. Treat it as a product.

**Choosing a style:**

| | REST (HTTP + JSON) | gRPC (HTTP/2 + Protobuf) | GraphQL |
|---|---|---|---|
| Best for | Public APIs, resource-oriented CRUD, broad compatibility | Internal service-to-service, low latency, streaming | Many client types with different data needs (web, mobile) |
| Contract | OpenAPI (optional but recommended) | `.proto` files (mandatory, strongly typed) | Schema (mandatory, strongly typed) |
| Caching | Excellent - HTTP caching, CDNs | Manual | Harder - usually POST to one endpoint; needs persisted queries or client caches |
| Browser support | Native | Needs gRPC-Web or a proxy | Native (over HTTP) |
| Main risk | Over/under-fetching, chatty clients | Harder to debug and inspect by hand | N+1 resolvers, expensive queries, authorisation per field |

A sane default: REST for public and browser-facing APIs, gRPC for high-volume internal calls where both sides are yours, GraphQL when you have a genuine "many clients, many shapes" problem (often as a backend-for-frontend layer), not because it's fashionable.

**REST basics that people still get wrong:**

- Resources are nouns (`/orders/123`), HTTP methods are verbs. `POST /createOrder` is RPC wearing a REST hat.
- Use status codes honestly: `201 Created` with a `Location` header, `400` for bad input, `404` for missing, `409` for conflicts, `422` for semantically invalid input, `429` for rate limits.
- Use a standard error body such as Problem Details (RFC 9457, which replaced RFC 7807).
- Paginate every list. Cursor-based pagination (`?after=abc`) is more stable than offsets for large, changing data.

**Versioning.** The best strategy is not needing to: make only *additive* changes and never remove or rename what clients use (tolerant readers that ignore unknown fields make this work). When you must break, pick one explicit scheme - a URL prefix (`/v2/orders`) is the most visible - publish a deprecation timeline, and run both versions in parallel for a while.

**Idempotency.** Networks fail *after* the server did the work. The client retries, and now the customer is charged twice. The fix is an idempotency key:

```http
POST /payments
Idempotency-Key: 5b1f0c7e-6a55-4d0f-9d2a-7d7f3b2a9e11
Content-Type: application/json

{ "orderId": "o-123", "amount": 4999, "currency": "EUR" }
```

```ts
async function handlePayment(key: string, body: PaymentRequest) {
  const existing = await idempotencyStore.get(key);
  if (existing) return existing.response;          // replay: same answer, no new charge

  const response = await payments.charge(body);    // do the work once
  await idempotencyStore.put(key, { response }, { ttlHours: 24 });
  return response;
}
```

In production also handle concurrent requests with the same key (insert the key first, under a unique constraint, in a "processing" state) and reject a reused key with a different body. `GET`, `PUT` and `DELETE` are idempotent by definition; `POST` and `PATCH` are not.

> **EXERCISE:** Take a feature from a real app (for example "user changes their email address"). Implement it twice: once as a hexagonal use case with a domain model, ports and in-memory test adapters, and once as a vertical slice that goes straight to SQL. Write down which version was faster to build, which is easier to test, and at what level of business-rule complexity you'd switch from one to the other.

### Signals you're ready for the next level

- You can explain where new logic belongs and why, and the team agrees.
- Other teams consume your APIs without constant back-and-forth.
- You think about failure paths (timeouts, duplicates, partial writes) unprompted.
- You mentor juniors on design, not just syntax.

## Stage 3 - Senior: designing systems

At this altitude the unit of design is a *system*: several deployable things, several data stores, networks between them, and real users hitting them at 3 a.m. The new questions are about behaviour under load, under failure, and over time. The "fallacies of distributed computing" (Peter Deutsch and colleagues at Sun) are your new daily reality: the network is not reliable, latency is not zero, bandwidth is not infinite, and topology does change.

### Monolith, modular monolith, microservices

This is the most over-discussed decision in modern software, so let's be precise.

- **Monolith** - one deployable unit, one database, internal structure often unclear. Simple to build, deploy and debug. Degrades into a "big ball of mud" when module boundaries aren't enforced.
- **Modular monolith** - still one deployable unit, but split into modules with explicit public interfaces and, ideally, their own schemas or tables that other modules may not touch. You get most of the design benefits of services with none of the distributed-systems tax.
- **Microservices** - independently deployable services, each owning its data, communicating over the network. You gain independent deployment, per-service scaling and team autonomy; you pay with network failures, eventual consistency, distributed debugging, and a lot of platform work.

![Three columns comparing a monolith as one tangled box, a modular monolith as one box with separated modules, and microservices as separate boxes each with its own database connected over a network](study/software-architecture-junior-to-architect/monolith-modular-microservices.svg "Figure 4. Monolith, modular monolith and microservices: where the boundaries are, and what enforces them")

| | Monolith | Modular monolith | Microservices |
|---|---|---|---|
| Deploy units | 1 | 1 | Many |
| Boundary enforcement | Discipline (usually none) | Build tooling, architecture tests, schemas | Network, separate repos and databases |
| Cross-module call | Function call | Function call via public interface | Network call (can fail, can be slow) |
| Transactions across modules | Easy (one DB) | Easy, but discouraged across modules | Sagas and eventual consistency |
| Operational cost | Low | Low | High (CI/CD per service, observability, platform) |
| Team scaling | Poor beyond a few teams | Good up to many teams | Good if boundaries are right, terrible if wrong |

**Why the modular monolith is often the right start:** early in a product you don't know where the real boundaries are. Drawing them wrong in a modular monolith costs a refactor. Drawing them wrong in microservices gives you a *distributed monolith* - services that must be deployed together, chat constantly and share data - which combines the downsides of both. Start modular, enforce the boundaries with tooling, and extract a module into a service only when you have a concrete reason: it needs independent scaling, a different release cadence, a different technology, isolation for security or compliance, or a separate team that is blocked by shared deploys.

Enforcing boundaries in a modular monolith is not optional; without it you'll have a regular monolith within a year. Examples: ArchUnit (Java) or NetArchTest / ArchUnitNET (.NET) for architecture rules in tests, Nx module-boundary lint rules or dependency-cruiser for TypeScript, and separate database schemas per module with separate credentials.

### Synchronous vs asynchronous communication

Once parts of your system talk over a network, you choose between two families:

- **Synchronous (request/response)** - HTTP/REST, gRPC. Simple mental model, immediate answer. But it creates *temporal coupling*: if the callee is down or slow, the caller is down or slow. A chain of five synchronous calls, each at 99.9% availability, gives you roughly 99.5% at best.
- **Asynchronous (messaging)** - the sender puts a message on a queue or topic and moves on. The receiver processes it when it can. Services are decoupled in time and spikes are absorbed by the queue. The price: eventual consistency, harder debugging, and delivery semantics you must understand.

Two flavours of messages are worth distinguishing:

- **Commands** - "please do X" (`ChargeCard`), addressed to the one handler that owns X. Usually a queue.
- **Events** - "X happened" (`OrderPlaced`), broadcast to anyone interested; the publisher doesn't know or care who listens. Usually a topic or stream.

### Event-driven architecture

In an event-driven system, services publish facts about what happened and other services react. The ordering service doesn't call inventory, billing and email; it announces `OrderPlaced`, and each of them subscribes. Adding a fraud-check consumer next month requires zero changes to the order service - that is Open/Closed at system scale.

![An order service publishes OrderPlaced to a message broker topic; inventory, billing, email and analytics services each consume it through their own subscription, with a dead-letter queue for failures](study/software-architecture-junior-to-architect/event-driven-broker.svg "Figure 5. Event-driven architecture: producers publish facts to a broker, consumers subscribe independently")

Common brokers in 2026 include **Apache Kafka** (and Kafka-compatible services) for high-throughput, replayable event streams; **RabbitMQ** for flexible routing and classic work queues; managed cloud options such as **AWS SQS/SNS/EventBridge**, **Azure Service Bus / Event Hubs** and **Google Cloud Pub/Sub**; and **NATS** for lightweight, low-latency messaging. The key conceptual split is *queue* (a message is consumed once, then gone) versus *log/stream* (messages are retained and each consumer tracks its own position, so you can replay history).

Things you must design for, every time:

- **At-least-once delivery is the realistic default.** End-to-end "exactly once" is mostly marketing; what you can build is *effectively once* via idempotent consumers (store processed message ids, or prefer `SET status = 'shipped'` over `count = count + 1`).
- **Ordering** is usually guaranteed only per partition, so partition by entity id when per-entity order matters.
- **Poison messages** go to a dead-letter queue after N attempts, with an alert.
- **Events are an API** - version them and evolve them additively, perhaps with a schema registry.

### Event sourcing and CQRS

Two patterns that often travel together but are independent:

**CQRS (Command Query Responsibility Segregation)** - use different models for writing and reading. Writes go through a domain model that enforces rules; reads come from projections shaped exactly for the screens that need them (a denormalised table, a search index, a cache). You can do CQRS with one database and two sets of classes. You don't need separate databases, and you certainly don't need event sourcing.

**Event sourcing** - instead of storing current state, store the sequence of events that led to it, and derive state by replaying them.

```text
Account a-7 event stream
  1  AccountOpened       { owner: "Ana" }
  2  MoneyDeposited      { amount: 100 }
  3  MoneyWithdrawn      { amount: 30 }
  4  MoneyDeposited      { amount: 50 }
current balance = fold(events) = 120
```

You gain a perfect audit log, time travel ("what did we know on 3 March?") and new read models by replay. You pay with complexity, event schemas you must version forever, snapshots for long streams, and fixing mistakes by appending compensating events. It shines in domains that already think in ledgers - accounting, bookings, logistics - and is overkill for most CRUD.

### Consistency across services: outbox and sagas

In a monolith, "create order, reserve stock, charge card" is one database transaction. Across services there is no global transaction (two-phase commit exists, but it couples availability of everyone involved and is rarely a good idea between microservices). Two patterns fill the gap.

**The dual-write problem.** Your service must update its database *and* publish an event. If you write the DB and crash before publishing, other services never hear about it. If you publish first and the DB write fails, you've announced something that didn't happen.

**The transactional outbox** solves it. In the same local transaction as your business change, insert the event into an `outbox` table. A separate relay (a poller, or change data capture with a tool like Debezium) reads the outbox, publishes to the broker, and marks rows as sent. Because the relay may publish a row more than once, consumers must be idempotent - which you needed anyway.

```sql
BEGIN;
  UPDATE orders SET status = 'placed' WHERE id = 'o-123';
  INSERT INTO outbox (id, aggregate_id, type, payload, created_at)
  VALUES (gen_random_uuid(), 'o-123', 'OrderPlaced', '{"total":4999}', now());
COMMIT;

-- relay loop
SELECT id, type, payload FROM outbox
WHERE sent_at IS NULL ORDER BY created_at LIMIT 100;
```

**Sagas** coordinate a business process across services as a sequence of local transactions, each paired with a *compensating action* that semantically undoes it if a later step fails. Refunding a card is the compensation for charging it; releasing a reservation is the compensation for reserving stock.

- **Choreography** - each service reacts to events and emits the next one. No central brain; fine for simple flows, hard to follow once there are more than a few steps.
- **Orchestration** - a saga orchestrator (a state machine) tells each service what to do and handles failures. Easier to reason about, monitor and change; the orchestrator is one more component to run. Durable workflow engines such as Temporal, AWS Step Functions or Azure Durable Functions are essentially orchestration as a service.

![The order service writes the order and an outbox row in one transaction; a relay publishes to the broker; an orchestrator reserves stock and charges payment, and when payment fails it runs compensations that release stock and cancel the order](study/software-architecture-junior-to-architect/saga-outbox.svg "Figure 6. Transactional outbox feeding an orchestrated saga, with compensating actions on failure")

> **WARNING:** Sagas give you *eventual* consistency, and between steps the system is visibly in an intermediate state ("order pending payment"). Design the UI and the business process for that state. If the business genuinely cannot tolerate it, that is a strong signal those steps belong in the same service and the same transaction.

### Data ownership

The most important rule of distributed data: **each piece of data has exactly one owner, and only the owner writes it.** Other services read it through the owner's API, or keep their own copy updated from the owner's events.

The shared database is the system-level version of content coupling from Stage 1. It feels efficient ("just join the tables!") and quietly makes independent deployment impossible, because any schema change can break a service you've never heard of.

Practical patterns: a database (or at least a schema with separate credentials) per service; **replicated read models**, such as billing keeping a local `customers` table updated from `CustomerUpdated` events; **API composition** in a backend-for-frontend for screens that need several services; and references by id across boundaries, exactly like aggregates.

### Caching strategies

Caching is the cheapest performance win and one of the most common sources of subtle bugs. Phil Karlton's line about cache invalidation being one of the two hard things in computer science is funny because it's true.

| Strategy | How it works | Good for | Watch out for |
|---|---|---|---|
| **Cache-aside** (lazy loading) | App reads cache; on miss, reads DB and fills cache | Most read-heavy workloads; the default | Stale data until TTL or explicit invalidation |
| **Read-through** | The cache layer itself loads from the DB on a miss | Same, with loading logic centralised | Needs a cache or library that supports loaders |
| **Write-through** | Writes go to cache and DB synchronously | Data read right after it's written | Extra write latency; caching data nobody reads |
| **Write-behind** (write-back) | Writes go to cache, flushed to DB later | Very high write rates where some loss is tolerable | Data loss if the cache dies before flushing |

Caches live at many layers - browser, CDN, gateway, process memory, a distributed cache (Redis, Valkey, Memcached) - and belong as close to the user as freshness allows. Design against three failure modes: the **stampede** (a hot key expires and a thousand requests hit the DB; fix with request coalescing or a short rebuild lock), **stale reads after writes** (delete the key on write, keep TTLs as a safety net), and the **hidden dependency** (if the DB can't survive a cold cache, the cache is critical infrastructure - load-test with it empty).

### Scalability and reliability patterns

**Scale up vs out.** Vertical scaling (a bigger machine) is simple and underrated - a single modern database server handles far more than most products ever need. Horizontal scaling (more machines) requires **stateless** application servers: keep session state in a shared store or in signed tokens, not in process memory.

**Load balancing.** Layer 4 balancers route TCP connections; layer 7 balancers understand HTTP and route by path or header. Use round robin or least connections by default, consistent hashing when the same key should hit the same node. Health checks should test whether an instance can actually serve, not just whether it's alive.

**Timeouts.** Every network call needs one, derived from the caller's latency budget. A call without a timeout is a connection you might never get back.

**Retries with exponential backoff and jitter.** Transient failures deserve a retry; synchronised retries from a thousand clients are a self-inflicted denial of service.

```ts
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 5, baseMs = 100, capMs = 5_000): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts || !isTransient(err)) throw err;
      const backoff = Math.min(capMs, baseMs * 2 ** (attempt - 1));
      const delay = Math.random() * backoff;            // "full jitter"
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

Only retry idempotent operations (or ones protected by idempotency keys), only retry transient errors (timeouts, 503, 429 - honouring `Retry-After`), and retry at *one* layer. Retries at every layer of a five-deep call chain multiply: 3 x 3 x 3 x 3 x 3 = 243 attempts for a single user click.

**Circuit breaker** (popularised by Michael Nygard's *Release It!*). After enough failures the breaker *opens* and fails fast for a cool-down period instead of hammering a struggling dependency; then it goes *half-open*, lets a few trial requests through, and *closes* if they succeed. Libraries: Polly (.NET), Resilience4j (Java), `opossum` or `cockatiel` (TypeScript), or a service mesh.

**Bulkheads.** Partition resources so one failing dependency can't sink the ship: separate connection pools per downstream, separate queues per tenant tier.

**Rate limiting and load shedding.** Reject excess requests early and cheaply (`429 Too Many Requests`), per API key or user. Token bucket is the common default because it allows short bursts. Load shedding is the emergency version: when saturated, drop low-priority work first.

**Graceful degradation.** Decide in advance what the product does when a dependency is down (recommendations unavailable? show static bestsellers). That's a product decision - ask for it explicitly.

### Observability

You cannot operate what you cannot see. Monitoring answers questions you predicted; observability lets you answer questions you didn't. The three classic signals:

- **Logs** - discrete events. Make them *structured* (JSON with consistent fields), include the trace id, and never log secrets or unnecessary personal data.
- **Metrics** - numeric time series, cheap to store and alert on. Use the RED method for services (Rate, Errors, Duration) and the USE method for resources (Utilisation, Saturation, Errors). Mind cardinality: a label containing user ids will explode your metrics bill.
- **Traces** - the path of one request across services, as a tree of timed spans. Traces turn "checkout is slow" into "checkout is slow because the tax service makes 40 sequential database calls".

**OpenTelemetry** (OTel) is the vendor-neutral CNCF standard for producing all three: APIs, SDKs and auto-instrumentation for major languages, a wire protocol (OTLP), and the Collector, which routes telemetry to whatever backend you choose (Prometheus, Grafana Tempo and Loki, Jaeger, or commercial platforms). Instrument once and you can change backends freely - dependency inversion again. Maturity per signal still varies by language, so check the status for yours.

Tie it together with **SLOs** (service level objectives), for example "99.9% of checkout requests succeed in under 800 ms over 30 days". The gap to 100% is your *error budget*. Alert when the budget is burning too fast, not on every CPU spike, and use the budget to negotiate between shipping features and investing in reliability.

### Security by design

Security bolted on at the end is expensive and leaky. At system altitude you design it in:

- **Threat model early.** For each new component, walk through STRIDE (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege). Thirty minutes at a whiteboard beats a pentest finding six months later.
- **Least privilege and zero trust.** Each service has its own identity and minimal permissions; being "inside the network" earns no trust, so authenticate (mTLS, workload identity) and authorise every call.
- **Standard identity protocols** - OAuth 2.x and OpenID Connect via a proven provider. Don't invent auth.
- **Secrets in a secret manager**, never in code, images or committed config. Rotate them.
- **Defence in depth** - validation, parameterised queries, output encoding, WAF and rate limits are layers, not alternatives. The OWASP Top 10 is the minimum checklist.
- **Encrypt in transit and at rest**, and know where personal data lives so you can honour privacy obligations such as GDPR deletion requests.
- **Supply chain** - pin and scan dependencies, generate SBOMs, sign build artefacts.

> **EXERCISE:** Draw your current system (or a side project) as boxes and arrows. For every arrow, write down: sync or async? timeout? retries, and at which layer? idempotent? what happens if the target is down for 10 minutes? Then list each important piece of data and its single owner. Every arrow you can't answer for is a future incident.

### Signals you're ready for the next level

- People come to you before building something big, and you lead the design review.
- You reason in trade-offs ("we gain X, we pay Y, Y is acceptable because Z"), not best practices.
- You've changed designs because of incidents you were on call for.
- Your influence reaches beyond your own team's codebase.

## Worked example: a URL shortener

Time to use the senior toolkit on a classic problem, done properly. The process matters more than the answer: requirements, estimates, API, data model, high-level design, deep dives, failure modes.

### Requirements

Functional:

- Create a short link for a long URL, optionally with a custom alias and an expiry date.
- Redirect a short link to its long URL.
- Basic click analytics per link (counts by day, country, referrer).

Non-functional - these are what actually drive the architecture:

- Redirects must be fast: p99 under 50 ms server-side.
- Redirects must be highly available (99.95% or better). Link creation can be slightly less available.
- Short codes never collide and never silently change target.
- Analytics may lag by a few minutes.

### Capacity estimates

Back-of-the-envelope maths tells you whether you need one database or fifty. Assume 100 million new links per month and a 100:1 read-to-write ratio.

```text
Writes:     100M / month / (30 x 86,400 s)       ~ 40 links/s average
            peak factor x5                        ~ 200 links/s
Reads:      100 x writes                          ~ 4,000 redirects/s average
            peak factor x5                        ~ 20,000 redirects/s

Storage:    ~500 bytes per link (URL, code, owner, timestamps, metadata)
            100M x 12 months x 5 years            = 6 billion links
            6B x 500 B                            ~ 3 TB (+ indexes and replicas)

Key space:  base62, 7 characters = 62^7           ~ 3.5 trillion codes
            needed over 5 years                   6 billion -> lots of headroom

Cache:      80/20 rule - ~20% of links get ~80% of clicks
            daily redirects ~ 4,000 x 86,400      ~ 350M
            hottest ~20M links x 500 B            ~ 10 GB -> fits in one Redis node

Analytics:  ~350M click events/day x ~100 B      ~ 35 GB/day raw
```

What the numbers tell you: writes are trivial for any database. Reads are moderate and extremely cacheable (targets rarely change), so the CDN and cache do most of the work. Storage is a few terabytes - large but ordinary. The biggest volume by far is analytics, which is why it must be decoupled from the redirect path.

### API

```http
POST /api/v1/links
Authorization: Bearer <token>
Idempotency-Key: 0c1d6f0e-3b0a-4f7e-9a51-2f4c8e7d1b22
Content-Type: application/json

{ "url": "https://example.com/some/very/long/path", "alias": "launch", "expiresAt": "2027-01-01T00:00:00Z" }

HTTP/1.1 201 Created
Location: /api/v1/links/launch

{ "code": "launch", "shortUrl": "https://sho.rt/launch" }
```

```http
GET /launch

HTTP/1.1 302 Found
Location: https://example.com/some/very/long/path
```

A real trade-off hides in that status code. **301 (permanent)** lets browsers cache the redirect, so repeat clicks never reach you - cheaper, but you lose analytics and can't change the target. **302/307 (temporary)** sends every click through you - more load, full analytics. Analytics-driven shorteners typically use 302 and absorb the load with a CDN and cache.

### Key generation

Options, from simplest to most robust:

1. **Hash the URL** (the first 7 base62 characters of a SHA-256) - deterministic, but you must handle collisions, and the same URL from different users yields the same code.
2. **Random 7-character codes** - insert with a unique constraint and retry on collision. With 6 billion of 3.5 trillion codes used, the chance a given insert collides stays well under 1%.
3. **Counter plus base62** - an id service hands out ranges of integers (say, blocks of 10,000 per app instance), which are encoded in base62. No collisions and no retries. Sequential codes are guessable, which you can mitigate by passing the integer through a reversible bit permutation before encoding.

Option 2 is a fine starting point; option 3 is what you graduate to at higher write volumes.

### High-level design

Drawn with the C4 model (covered in Stage 4): a *context* view of who uses the system, and a *container* view of the deployable parts inside.

![C4 context and container views of the URL shortener: visitors and link owners use the system, which depends on a URL safety service; inside, a CDN and redirect service read from Redis and the link store, a links API writes links, and click events flow through a stream to an analytics store](study/software-architecture-junior-to-architect/c4-url-shortener.svg "Figure 7. C4 context (top) and container (bottom) views of the URL shortener")

- **Redirect path (hot, read-only):** CDN -> stateless redirect service -> Redis -> link store on a miss. It emits click events *asynchronously* and never waits for analytics.
- **Management path (cold, writes):** the authenticated links API validates URLs, checks them against malware and phishing lists (shorteners are abused constantly), generates codes and writes to the link store.
- **Analytics path (async):** click events flow through a stream (Kafka or a managed equivalent) into a columnar store (ClickHouse, BigQuery and the like).
- **Storage:** a pure key lookup suits a key-value store (DynamoDB, Cassandra) partitioned by code - but a well-indexed PostgreSQL with read replicas handles these volumes for a long time. Start with what your team knows.

### Deep dives and failure modes

- **Viral link, cold cache:** request coalescing, plus a short negative cache for unknown codes to blunt enumeration.
- **Link store down:** cached redirects keep working; creation fails clearly. That's the graceful degradation the requirements asked for.
- **Stream down:** buffer click events up to a bound, then drop and count. Losing some analytics is acceptable; slowing redirects is not. Writing that sentence down *is* architecture.
- **Abuse:** rate-limit creation per account and IP, scan targets, support takedowns.

> **EXERCISE:** Redo this design for a "ride-hailing lite" service: riders request rides, nearby drivers get offers, one driver accepts. Estimate location updates per second (say 50,000 active drivers updating every 4 seconds = 12,500 writes/s), decide how to find nearby drivers (geohash or H3 cells in an in-memory store), and explain how you guarantee only one driver can accept a ride. Hint: a conditional write on the ride's state (`UPDATE rides SET driver = ? WHERE id = ? AND driver IS NULL`), not a distributed lock held across services.

## Stage 4 - Staff and Architect: thinking in strategy

At the top altitude your unit of design is the *decision*: which boundaries the organisation draws, which qualities it optimises for, which risks it accepts, and how all of that is recorded so dozens of engineers can move in the same direction without you in the room. Soft skills stop being optional: a brilliant design that nobody understands, funds or follows has zero value.

### Strategic DDD: bounded contexts

In a growing company, "customer" means different things to different people: a lead with a pipeline stage for sales, a legal entity with a VAT number for billing, a person with tickets for support. One `Customer` model for everyone becomes a 90-field god object every team fears.

A **bounded context** is an explicit boundary within which a model and its language (the *ubiquitous language*) are consistent. Across contexts the same real-world concept can have different models - that's healthy, not duplication. Bounded contexts are the best starting point for modules in a modular monolith and for services later; they're linguistic and organisational boundaries first, technical ones second.

To find them, run **Event Storming** (Alberto Brandolini): domain experts and engineers put every domain event on a timeline with sticky notes, and you watch where clusters form and where the language shifts - when a word changes meaning, you've crossed a boundary. Then classify subdomains: *core* (where you differentiate - invest your best people here), *supporting* (necessary, not special) and *generic* (auth, email, payments - solved problems, buy them).

A **context map** shows how contexts relate. Evans named a set of relationship patterns, and they describe politics as much as technology:

| Pattern | What it means |
|---|---|
| **Partnership** | Two teams succeed or fail together and coordinate closely |
| **Shared Kernel** | A small, jointly owned piece of model (keep it tiny) |
| **Customer-Supplier** | Upstream supplier considers downstream needs in its planning |
| **Conformist** | Downstream just adopts the upstream model; it has no leverage |
| **Anticorruption Layer (ACL)** | Downstream translates the upstream model to protect its own (the Adapter pattern, grown up) |
| **Open Host Service** | Upstream offers a well-defined protocol/API for many consumers |
| **Published Language** | A documented shared exchange format (often paired with Open Host Service) |
| **Separate Ways** | No integration; each context solves its own problem |

![A context map of an e-commerce company: Catalog, Ordering, Billing, Shipping, Identity and a legacy ERP, connected by labelled relationships such as open host service, customer-supplier, conformist and anticorruption layer](study/software-architecture-junior-to-architect/context-map.svg "Figure 8. A context map: bounded contexts and the relationships (and power dynamics) between them")

> **TIP:** When integrating with a legacy system or a third-party API whose model you don't like, put an Anticorruption Layer in front of it. It costs a translation layer now and saves your domain model from slowly turning into the vendor's.

### Quality attributes and trade-off analysis

Functional requirements say *what* the system does. Quality attributes (the "-ilities") say *how well*: performance, availability, security, modifiability, deployability, cost-efficiency and so on (ISO/IEC 25010 offers a standard vocabulary). The key insight: **quality attributes conflict, and architecture is choosing which ones win** - consistency vs availability under partitions (CAP) and latency vs consistency otherwise (PACELC), security vs usability, flexibility vs simplicity, time to market vs everything.

Make vague words concrete with **quality attribute scenarios** (source, stimulus, environment, response, measure). "Scalable" is useless. "During the Black Friday peak (environment), when 20,000 users per minute start checkout (stimulus), 99% of checkouts complete in under 2 seconds (measure)" is something you can design and test for.

**ATAM-lite.** The Architecture Tradeoff Analysis Method from the Software Engineering Institute is a heavyweight, multi-day process. A lightweight version works for most teams:

1. **Collect the top quality attributes** from stakeholders and rank them. Forcing a ranking is the most valuable step - "everything is priority one" means nothing is.
2. **Write 5-10 concrete scenarios** for the top-ranked attributes.
3. **Walk each candidate architecture through each scenario.** How does it respond? What would have to change?
4. **Record sensitivity points** (decisions that strongly affect one attribute), **trade-off points** (decisions that affect several attributes in opposite directions), and **risks**.
5. **Decide, and write an ADR.**

A radar chart comparing candidate architectures on the top attributes is a surprisingly effective way to show stakeholders the shape of a trade-off at a glance.

![Radar chart comparing a modular monolith and microservices across six quality attributes: simplicity, time to market, cost efficiency, independent deployability, elastic scalability and fault isolation](study/software-architecture-junior-to-architect/quality-attributes-radar.svg "Figure 9. Trade-off radar: no option wins on every axis - you pick the shape that fits your ranked priorities")

### Architecture Decision Records

Decisions evaporate. Six months later nobody remembers why you picked PostgreSQL over DynamoDB, and the team re-litigates it from scratch. An **Architecture Decision Record** (format popularised by Michael Nygard in 2011) is a short text file capturing one significant decision, its context and its consequences. Keep ADRs numbered in the repository (`docs/adr/0007-...md`) and never edit an accepted one - supersede it with a new ADR. A complete example:

```text
ADR-0007: Start as a modular monolith, not microservices

Status:    Accepted (2026-03-12)
Deciders:  Platform lead, Orders lead, Payments lead, CTO
Supersedes: none

CONTEXT
We are rebuilding the order management platform. Four teams (about 22 engineers)
will work on it. Current load is ~150 requests/s at peak, forecast to triple
within 18 months. Domain boundaries (Ordering, Billing, Catalog, Shipping) are
reasonably understood, but Billing's rules are still changing weekly.
We have one platform engineer and no existing Kubernetes or service-mesh expertise.
Top ranked quality attributes: time to market, modifiability, cost efficiency.

DECISION
We will build a single deployable modular monolith (.NET) with one module per
bounded context. Each module owns its own database schema; cross-module access
goes only through each module's public interface or in-process domain events.
Boundaries are enforced by architecture tests in CI.
Integration events leave the monolith through a transactional outbox.

ALTERNATIVES CONSIDERED
1. Microservices per bounded context - rejected for now: high operational cost for
   our platform capacity, and Billing boundaries are not yet stable.
2. Classic layered monolith - rejected: no enforced boundaries; we have lived
   through that outcome before.

CONSEQUENCES
+ One pipeline, one deployment, simple local development and debugging.
+ Refactoring a wrong boundary is a code change, not a migration.
+ Outbox and schema-per-module make later extraction of a service feasible.
- All modules share one release cadence; a bad deploy affects everyone.
- Scaling is all-or-nothing until a module is extracted.
- We must invest in architecture tests or the boundaries will erode.

REVISIT WHEN
- A module needs an independent release cadence or scaling profile, or
- More than 6 teams contribute, or peak load exceeds ~2,000 requests/s.
```

Notice the "Revisit when" section: it turns the decision into a hypothesis with explicit triggers. That's what makes it evolutionary instead of dogmatic.

### The C4 model

Most architecture diagrams fail because they mix levels of detail and use unexplained boxes and arrows. The **C4 model** (Simon Brown) fixes that with four zoom levels, like a map:

1. **System Context** - your system as one box, its users, and the systems it talks to. For everyone, including non-technical stakeholders.
2. **Container** - the deployable units inside (web app, API, database, queue) and how they communicate. For technical people.
3. **Component** - the main building blocks inside one container. For its developers.
4. **Code** - classes and functions. Usually skip it; your IDE shows this on demand.

Levels 1 and 2 give most of the value; Figure 7 showed both. Readability rules: every box has a name, type and one-line responsibility; every arrow says what flows and how ("reads links [Redis protocol]"); every diagram has a title and key. Structurizr, PlantUML's C4 extension and Mermaid let you keep diagrams as code, reviewed in pull requests.

### Fitness functions and evolutionary architecture

Architecture erodes. Nobody decides to couple the billing module to the shipping module's tables; it happens one urgent pull request at a time. *Building Evolutionary Architectures* (Ford, Parsons, Kua and later Sadalage) proposes **fitness functions**: automated checks that protect architectural characteristics, the same way unit tests protect behaviour.

```csharp
// An architecture test (NetArchTest) that runs in CI on every pull request
[Fact]
public void Billing_must_not_depend_on_Shipping_internals()
{
    var result = Types.InAssembly(typeof(BillingModule).Assembly)
        .ShouldNot()
        .HaveDependencyOn("Shop.Shipping.Internal")
        .GetResult();

    Assert.True(result.IsSuccessful);
}
```

Other fitness functions: a CI performance test that fails if checkout p95 latency regresses by more than 10%, a build that fails on critical CVEs or disallowed licences, a front-end bundle-size budget, a cost check on infrastructure changes, and chaos experiments proving you survive losing an availability zone.

The idea generalises: every important architectural decision should, where feasible, come with an automated guardrail. An ADR explains the decision; a fitness function enforces it.

### Conway's law and team topologies

Melvin Conway observed in 1968 that organisations design systems that mirror their communication structures. It's closer to gravity than to advice: if one team owns four "independent" services, or five teams share one service, the architecture drifts toward the org chart.

The practical consequence is the **inverse Conway manoeuvre**: design your team structure to match the architecture you want. *Team Topologies* (Matthew Skelton and Manuel Pais) gives a useful vocabulary:

- **Four team types:** *stream-aligned* (owns a flow of business value end to end - most teams should be this), *platform* (provides self-service internal products that reduce other teams' cognitive load), *enabling* (coaches other teams in a new capability, temporarily), and *complicated-subsystem* (owns a part that requires deep specialist knowledge, such as a pricing engine).
- **Three interaction modes:** *collaboration* (working closely together for a period), *X-as-a-Service* (consuming something with minimal coordination), and *facilitating* (one team helping another learn).
- **Cognitive load** as a first-class design constraint: if a team owns more than it can hold in its heads, quality drops, whatever the architecture diagram says.

Org design conversations are not a distraction from architecture; they *are* architecture.

### Managing technical debt

Ward Cunningham's metaphor: shipping imperfect code is like taking a loan - you move faster now and pay interest later in the form of slower changes. Some debt is smart. Martin Fowler's technical debt quadrant separates *deliberate vs inadvertent* and *prudent vs reckless* debt: "we must ship now and will deal with the consequences" (prudent, deliberate) is a business decision; "what's layering?" (reckless, inadvertent) is a skills problem.

How to manage it at architect altitude:

- **State the interest in business terms**: "every pricing change takes 3 days instead of 1 because of X". Interest, not principal, gets prioritised.
- **Target hotspots.** Debt in code nobody touches costs almost nothing; cross-reference complexity with change frequency from git history (Adam Tornhill's *Your Code as a Crime Scene* shows how).
- **Pay continuously** with a steady capacity allocation rather than "refactoring sprints" that always get cancelled.
- **Strangle, don't rewrite.** The strangler fig pattern routes traffic through a facade and replaces the old system piece by piece. Big-bang rewrites are where careers go to die.

### Build vs buy

Every hour your team spends building a generic capability is an hour not spent on what makes your product different. Use the core/supporting/generic classification from strategic DDD:

| Subdomain | Default | Reasoning |
|---|---|---|
| Core (your differentiator) | Build | This is where custom code creates competitive advantage |
| Supporting | Build simply, or buy/adapt | Needed, not special; keep it cheap |
| Generic (auth, email, payments, search, observability) | Buy or use open source | Solved problems; vendors do it better |

When evaluating a "buy", look beyond the licence: integration effort, data export, exit cost, vendor health, data residency, and total cost over 3-5 years. Wrap external products behind your own port or ACL so the exit door stays open.

### Cloud cost awareness

In the cloud, architecture decisions are purchasing decisions. A chatty microservice design that sends terabytes across availability zones, a log pipeline that ingests everything at debug level, or an idle over-provisioned cluster can cost more than the team that built it. The FinOps discipline boils down to a few habits:

- **Make cost a quality attribute** in design reviews and ADRs, with an estimate, not a shrug.
- **Know the usual surprises:** data egress and cross-zone traffic, NAT gateways, log and metrics ingestion, idle resources.
- **Tag everything** by team and product; what nobody owns, nobody optimises.
- **Match pricing to load shape.** Serverless suits spiky or low traffic and can get expensive at sustained high throughput; reserved capacity suits steady baselines. Prices change often, so check your provider's current pricing pages.
- **Track unit economics** - cost per order or per active user. Rising spend is fine if cost per unit falls.

### Communicating architecture

The hardest part of the job is not deciding; it's getting a large group of people to understand and act on the decision. Some field-tested practices:

- **Know your audience's altitude.** Executives want risk, cost, time and options; product managers want what becomes possible; engineers want boundaries, contracts and reasons. One decision, three explanations.
- **Lead with the problem and the trade-off**, not the technology. "We'll accept slightly stale stock counts on the product page so checkout stays up during peaks" beats "we're introducing CQRS with Kafka".
- **Write.** A two-page design doc with context, options and a recommendation scales far better than meetings. Collect written comments first, so the meeting is for deciding.
- **Offer options, not ultimatums** - stakeholders often know constraints you don't.
- **Ride the "architect elevator"** (Gregor Hohpe's metaphor) between the engine room and the penthouse, translating in both directions.
- **Follow up.** Revisiting a decision on new evidence builds more trust than defending it.

### Signals you're operating at this level

- Teams you don't manage decide better because of artefacts you created (ADRs, principles, paved roads, fitness functions).
- You can explain the same architecture to a CFO and to a new junior, each in terms that matter to them.
- You think in multi-year horizons and in one-way vs two-way doors (irreversible vs reversible decisions).
- You still read and write code often enough to know whether your diagrams are true.

> **EXERCISE:** Pick one significant decision your team made in the last year that nobody wrote down. Write the ADR for it retroactively, including alternatives and a "Revisit when" section. Then draw a C4 context and container diagram of the system it affects, and write one fitness function that would catch a violation of the decision. Share all three with your team and note which questions they ask - those questions show you where your communication gaps are.

## Architecture in the age of AI (2026)

In 2026, many products include features powered by large language models, and most engineers use AI coding assistants daily. Both change the architect's job less than the hype suggests - but they do change it. The fundamentals of this article still apply; LLMs are components with unusual quality attributes.

### LLMs as architectural components

Treat a model call like any other external dependency, and apply everything from Stage 3:

- **It's slow and variable.** Stream output to users; set latency budgets and timeouts.
- **It's non-deterministic.** You can't unit-test your way to confidence; you need **evaluation suites** (curated inputs with graded expected behaviour) running in CI like fitness functions.
- **It costs money per call** (usually per token), so cost becomes a per-request quality attribute. Cache, and route simple tasks to smaller models.
- **It fails and changes.** Rate limits, outages and model deprecations happen. Put the model behind a port with an adapter per provider, pin versions, plan degradation.
- **It's an untrusted input channel.** Prompt injection means any text the model reads may try to steer it. Validate structured output against a schema, give tools least privilege, and require human confirmation for consequential actions.

### RAG as an architectural pattern

**Retrieval-Augmented Generation** answers questions with a model, grounded in *your* data. It's the most common LLM architecture in business software, and it's mostly a data and search problem:

```text
Ingestion (async, like any ETL pipeline)
  documents -> clean and split into chunks -> compute embeddings -> index
  (vector store, often plus a keyword index for hybrid search)

Query (sync, on the request path)
  question -> retrieve top-k relevant chunks (with access-control filtering!)
           -> optional re-ranking
           -> prompt = instructions + retrieved context + question
           -> model -> answer with citations -> guardrails / validation -> user
```

The decisions are familiar ones in new clothing: data freshness (how fast do edits reach the index?), authorisation (filter at retrieval time so users never see chunks from documents they can't open), caching, observability (trace each step, log retrieved chunk ids), and evaluation (does retrieval find the right chunks, and does the answer stay faithful to them?). Many teams also expose tools and data to models through standard protocols such as the Model Context Protocol (MCP) - architecturally an adapter layer that deserves the same least-privilege thinking as any API.

> **NOTE:** The field moves fast. Model capabilities, prices and context sizes change every few months, so check providers' current documentation rather than trusting any number printed in an article - including this one. The durable skills are the architectural ones: boundaries, evaluation, cost awareness and security.

### AI-assisted development

AI assistants make writing code much cheaper. That makes the *other* parts of the job relatively more valuable: knowing what to build, choosing boundaries, reviewing for design quality, and keeping a codebase coherent. Some practical consequences:

- **Clear architecture helps the tools.** Assistants do much better with consistent patterns, small cohesive modules, good names, and written conventions and ADRs they can read. Stages 1 and 2 pay double.
- **Fitness functions matter more.** When code arrives faster than humans can deeply review it, architecture tests, types and test suites are what hold the line against erosion.
- **Review for design.** Generated code is often locally plausible and globally inconsistent - duplicated helpers, bypassed boundaries, surprise dependencies.
- **Don't outsource understanding.** Let AI explore options and draft ADRs, diagrams and tests; you remain accountable for the trade-offs.

## Reading list

Real books that repay the time, grouped by altitude. Pick one per stage and actually do its exercises.

| Altitude | Book | Why read it |
|---|---|---|
| Code | *A Philosophy of Software Design* - John Ousterhout | Deep modules and managing complexity |
| Code | *Refactoring* (2nd ed.) - Martin Fowler | Improving design safely, in small steps |
| Code | *Head First Design Patterns* (2nd ed.) - Freeman and Robson | The friendliest path into the GoF patterns |
| Application | *Clean Architecture* - Robert C. Martin | The dependency rule and component boundaries |
| Application | *Domain-Driven Design* - Eric Evans | The original; the strategic chapters are essential |
| Application | *Learning Domain-Driven Design* - Vlad Khononov | The most readable modern DDD introduction |
| System | *Designing Data-Intensive Applications* - Martin Kleppmann | Replication, partitioning, consistency, streams |
| System | *Release It!* (2nd ed.) - Michael Nygard | Stability patterns from real production failures |
| System | *Building Microservices* (2nd ed.) - Sam Newman | When and how to split, and what it costs |
| Strategy | *Fundamentals of Software Architecture* - Mark Richards and Neal Ford | Architecture characteristics, styles, soft skills |
| Strategy | *Software Architecture: The Hard Parts* - Ford, Richards, Sadalage, Dehghani | Trade-off analysis for distributed systems |
| Strategy | *Building Evolutionary Architectures* (2nd ed.) - Ford, Parsons, Kua, Sadalage | Fitness functions and incremental change |
| Strategy | *Team Topologies* - Matthew Skelton and Manuel Pais | Conway's law made actionable |
| Strategy | *The Software Architect Elevator* - Gregor Hohpe | Communicating across the organisation |

## Cheat sheet

**The one-liner:** architecture is the set of decisions that are expensive to change. Make them deliberately, write them down, keep everything else cheap to change.

**Junior - code**

- Clear names; functions do one thing at one level of abstraction; pure logic, I/O at the edges.
- High cohesion, low coupling. Pass simple data, not flags or globals.
- SOLID: one reason to change; extend by adding code; subtypes keep promises; small interfaces; abstractions owned by the high-level side.
- DRY is about knowledge, not text. KISS, YAGNI, rule of three. Composition over inheritance.
- Strategy, Factory, Adapter, Observer, Decorator. Hard to test means too coupled.

**Mid-level - application**

- Dependencies point inward (hexagonal, onion and clean are the same idea). Ports only where there's a reason.
- Vertical slices for cohesion by feature; rich domain models where rules are complex.
- Value objects everywhere; small aggregates; reference by id; one aggregate per transaction.
- REST public, gRPC internal high-volume, GraphQL for many varied clients. Evolve APIs additively; idempotency keys.

**Senior - system**

- Modular monolith first; extract services for concrete reasons. One owner per piece of data.
- Sync = temporal coupling; async = eventual consistency. At-least-once + idempotent consumers + DLQ.
- Outbox for reliable publishing; sagas with compensations across services.
- Cache-aside by default; guard against stampedes.
- Timeouts everywhere; retries with backoff and jitter at one layer; circuit breakers, bulkheads, rate limits.
- OpenTelemetry for logs, metrics, traces; SLOs and error budgets. Threat model; least privilege; zero trust.
- Estimate before you design.

**Staff / Architect - organisation**

- Bounded contexts around consistent language; context maps for relationships and power.
- Rank quality attributes, write scenarios, find trade-off points, record ADRs with "revisit when".
- C4 context and container diagrams. Fitness functions against erosion.
- Conway's law: design teams and architecture together. Measure debt by its interest.
- Build the core, buy the generic, wrap vendors behind ports. Cost is a quality attribute.
- LLMs are slow, costly, non-deterministic, untrusted dependencies - evaluate, isolate, guard.

## Where to go next

- **Practise system design weekly.** Pick a known product (chat app, news feed, payments) and sketch requirements, numbers, a C4 container diagram and three failure modes in 45 minutes; then compare with engineering blog posts from companies that built something similar.
- **Start an ADR log today** - a plain `docs/adr/` folder is enough.
- **Add one fitness function** to CI this month.
- **Run an informal Event Storming session** with two colleagues on part of your domain.
- **Instrument something with OpenTelemetry** end to end and study a real trace.
- **Ask why.** Ask senior colleagues why things are the way they are and write the answers down. Architecture is mostly accumulated reasons.
- **Revisit this article at each stage.** The first time, Stage 1 will feel like the important part. Later, you'll notice that every stage was saying the same thing at a different altitude: find the boundaries, manage the dependencies across them, and make the trade-offs explicit.
