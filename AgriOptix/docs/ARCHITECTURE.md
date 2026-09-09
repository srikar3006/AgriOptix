# Architecture

Farmer
→ Harvest Input
→ AI Quality
→ Perishability
→ Market Intelligence
→ Smart Aggregation
→ Route Calculation
→ Perishability-Aware Optimization
→ Selling Plan
→ Order Execution
→ Delivery Verification
→ Settlement
→ Feedback
→ Learning

Service boundaries:
QualityService, PerishabilityService, MarketService, AggregationService,
RoutingService, OptimizationService, OrderService, SettlementService,
VoiceService, LearningService.

The prototype keeps these boundaries modular without unnecessary microservices.
