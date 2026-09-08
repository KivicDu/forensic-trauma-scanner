# Hướng dẫn thuật toán, giải thuật và công nghệ trong Child Safety Simulator

## 1. Mục tiêu của hệ thống
Hệ thống này mô phỏng các tình huống nguy hiểm cho trẻ em trong môi trường nội thất bằng cách kết hợp:
- Vật lý 3D để tính va chạm thực tế
- AI Gemini để tạo hành vi trẻ em theo độ tuổi
- Phân tích rủi ro để đưa ra điểm số và bản đồ nhiệt
- Giao diện 3D để người dùng quan sát và kiểm tra

Nói ngắn gọn: hệ thống giống như một “bộ mô phỏng an toàn trẻ em” chạy trên web.

---

## 2. Luồng vận hành tổng thể

### Cách đơn giản
1. Người dùng tải mô hình phòng (GLB/GLTF).
2. Hệ thống đọc mô hình và phân loại vật thể trong phòng.
3. Chọn độ tuổi trẻ em (infant, toddler, preschool, child).
4. Hệ thống tạo hành vi trẻ em bằng AI hoặc bằng luật dựa trên nghiên cứu.
5. Chạy mô phỏng va chạm bằng vật lý 3D.
6. Tính điểm nguy hiểm, xác định vùng dễ xảy ra tai nạn.
7. Hiển thị kết quả dưới dạng heatmap, bảng sự kiện và báo cáo.

### Cách dev
Luồng thực tế:
- Frontend gửi yêu cầu tới backend qua REST API.
- Backend dùng Express để nhận request.
- Simulation controller gọi PhysicsEngine + BehaviorManager + InjuryCalculator.
- Rapier3D tạo world vật lý và xử lý collision.
- Gemini API hoặc StandardBehaviorLibrary tạo hành vi agent.
- RiskAnalytics tổng hợp sự kiện và phát sinh báo cáo.

---

## 3. Các thuật toán / giải thuật chính

### A. Thuật toán vật lý va chạm (Rapier3D)

#### Cơ chế hoạt động chi tiết
- Rapier tạo một "world vật lý" và chạy theo từng frame với thời gian delta.
- Mỗi vật thể trong phòng được chuyển thành rigid body + collider.
- Agent trẻ em dùng `kinematicPositionBased()` để được điều khiển thủ công bằng logic di chuyển.
- Các vật cố định như bàn, ghế, tường được tạo bằng `fixed()` body.
- Rapier dùng collision groups để quyết định vật nào được xét va chạm với vật nào.
- Khi va chạm xảy ra, event queue ghi nhận sự kiện để controller tính điểm chấn thương.

#### Cách đơn giản
Giống như có một “bộ tính toán vật lý” trong game engine:
1. Đưa từng món đồ vào bản đồ vật lý.
2. Cho trẻ di chuyển qua đó.
3. Nếu chạm nhau thì tính xem lực va chạm như thế nào.
4. Nếu va chạm quá mạnh, hệ thống đánh dấu là nguy hiểm.

#### Cách dev
- `createWorld()` khởi tạo gravity = -9.81.
- `createAgentMultipartCollider()` tạo 3 phần: head / torso / legs.
- `createCharacterController()` dùng kinematic character controller để chống clip qua tường.
- `moveAgentWithController()` cập nhật vị trí dựa trên vector di chuyển đã được Rapier căn chỉnh.
- `step(world, deltaTime)` gọi `world.step()` để tính tiếp theo frame.
- `processCollisions()` đọc `eventQueue.drainCollisionEvents(...)` để lấy các cặp va chạm.

---

### A1. Thuật toán BBox / OBB / AABB và mesh parsing

#### Cách đơn giản
Trước khi mô phỏng, hệ thống phải "đo kích thước" từng món đồ trong phòng:
- BBox (bounding box) là hộp bao quanh vật thể.
- OBB (oriented bounding box) là hộp bao quanh nhưng có thể xoay theo vật thể.
- AABB là hộp bao quanh theo trục chuẩn, không xoay.
- Mesh collision là lấy đúng hình dáng thực của vật thể để va chạm chính xác hơn.

#### Cơ chế hoạt động chi tiết
- Trong `glbParser.js`, hệ thống đọc file GLB bằng `@gltf-transform/core`.
- Với mỗi mesh primitive, lấy `POSITION` attribute và tính min/max theo x, y, z.
- Dùng ma trận biến đổi (translation + rotation + scale) để chuyển bbox từ local space sang world space.
- Tính 8 góc của hộp, biến đổi tất cả 8 điểm bằng ma trận, rồi tìm min/max mới.
- Sau đó, dựa trên mesh và tên đối tượng, hệ thống suy ra chiến lược collider phù hợp:
  - cuboid / AABB / OBB cho bề mặt phẳng
  - convexHull cho hình tròn, vật rắn đơn lẻ
  - compound cho bàn, ghế, tủ có khoảng trống bên trong
  - trimesh cho hình phức tạp và chính xác

#### Cách dev
- `calculateBoundingBox(mesh)` lấy min/max từ tất cả đỉnh primitive.
- `transformBoundingBox(bbox, matrix)` biến đổi 8 góc bằng `applyMatrixToPoint()`.
- `decomposeMatrix()` lấy vị trí + quaternion + scale từ world matrix.
- `farthestPointSample()` giảm số đỉnh bằng thuật toán greedy farthest-point sampling để giữ hình dạng nhưng giảm độ nặng khi tạo hull.
- `inferColliderStrategy()` quyết định đường đi collider dựa trên tên đối tượng và số primitive.

#### Vì sao quan trọng
- Nếu không có bbox, hệ thống không biết vật nào to, vật nào nhỏ, vật nào phải dùng collider nào.
- Nếu dùng collider sai, trẻ sẽ bị clip qua đồ, hoặc bị chặn bởi vùng rỗng giả tạo.

---

### A2. Thuật toán tạo collider mesh (trimesh / convexHull / compound)

#### Cách đơn giản
Đây là thuật toán “tạo lớp đệm vật lý” quanh đồ vật.
- Với đồ đơn giản: chỉ cần một khung hộp.
- Với đồ phức tạp: dùng đúng hình dạng thật của đồ.
- Với đồ có khe hở (ghế, bàn, tủ): dùng nhiều khối nhỏ thay vì một khối lớn.

#### Cách dev
Trong `Backend/utils/colliderGenerator.js`:
1. Duyệt toàn bộ object từ sceneData.
2. Nếu object là soft object, tạo sensor-only collider để phát hiện chạm mà không tạo rào cản thật.
3. Nếu object có `collisionMesh`, dùng:
   - OBB cho mesh box-like (≤24 triangle)
   - Trimesh cho mesh phức tạp (>24 triangle)
4. Nếu object có `collisionPrimitives`, tạo compound collider bằng nhiều convex hulls.
5. Nếu object có `collisionVertices`, tạo convex hull collider.
6. Nếu không có dữ liệu mesh, dùng AABB / OBB fallback.

#### Cơ chế tối ưu hóa
- Thuật toán chọn đường đi collider bằng heuristic:
  - flat surface → box / OBB
  - open-frame furniture → compound
  - curved object → convexHull
  - dense curved mesh → trimesh
- Mục đích là giữ độ chính xác nhưng giảm số phép tính.

#### Vì sao quan trọng
- Đây là phần quyết định chất lượng mô phỏng vật lý.
- Nếu collider sai, dữ liệu va chạm và điểm chấn thương sẽ sai luôn.

---

### B. Thuật toán phân loại đối tượng trong phòng (Object Classification)

#### Cách đơn giản
Hệ thống đọc tên đồ vật và màu sắc / chất liệu để đoán đó là gì:
- bàn, ghế, cửa, giường, dây điện, đồ chơi, vật sắc nhọn, v.v.
- Từ đó biết nó có nguy hiểm gì không.

#### Cách dev
Trong `Backend/utils/objectClassifier.js`:
- Dùng `OBJECT_KEYWORDS` dictionary để khớp tên vật bằng keyword.
- Nếu khớp bằng tên, lấy `category`, `subcategory`, `surfaceType`, `attractionByAge`.
- Nếu không khớp, dùng heuristic theo hình dạng:
  - height/width ratio
  - flatness
  - volume
  - material roughness / metallic factor
- Có cả phân loại dựa trên màu sắc và roughness để suy ra wood / metal / plastic / fabric.

#### Cơ chế
- `classifyObject()` chạy 3 lớp logic:
  1. name matching
  2. material inference
  3. shape-based fallback
- `classifyScene()` áp dụng cho tất cả đối tượng trong scene.

#### Vì sao quan trọng
- Bởi vì đúng lúc phân loại đúng, hệ thống mới biết ai đáng chú ý, ai dễ gây té ngã, ai có nguy cơ điện giật, cắt, chấn thương đầu, v.v.

---

### C. Thuật toán hành vi trẻ em (AI + fallback logic)

#### Cách đơn giản
Hệ thống không cho trẻ “đi ngẫu nhiên vô tội vạ” một cách máy móc.
Nó có các kiểu hành vi theo độ tuổi:
- Em bé bò tìm đồ nhỏ, thích chạm điện, cầm vật trên sàn.
- Trẻ nhỏ đứng dậy rồi thử trèo ghế, kéo ngăn kéo.
- Trẻ lớn hơn chạy, nhảy, leo lên vật cao hơn.

#### Cách dev
Trong `Backend/services/hybridBehaviorEngine.js` và `Backend/services/behaviorManager.js`:
- Dùng `getBehaviorWithFallback()` để thử AI trước.
- Nếu Gemini lỗi / timeout / rate limit thì chuyển sang fallback.
- Fallback dùng `StandardBehaviorLibrary` để tạo hành vi dựa trên nghiên cứu y học và phát triển trẻ em.
- Có cache để không gọi AI lặp lại nhiều lần.
- Có timeout 15s và retry 2 lần.

#### Mô hình logic
- AI mode: Gemini tạo hành vi.
- Fallback mode: luật nghiên cứu sinh học, hành vi lứa tuổi.
- AUTO mode: ưu tiên AI, nếu thất bại thì dùng fallback.

#### Vì sao quan trọng
- Giúp hệ thống “có tính cách”, không chỉ là mô hình vật lý trừu tượng.
- Là phần làm cho simulation “đẹp” và có ý nghĩa hơn.

---

### D. Thuật toán đánh giá chấn thương (Injury Calculator)

#### Cách đơn giản
Khi trẻ va chạm vào vật, hệ thống sẽ đo:
- trẻ đang đi nhanh bao nhiêu
- va chạm xảy ra trong bao lâu
- vật va chạm làm bằng chất liệu gì
- trẻ đang rơi hay không
- phần cơ thể bị ảnh hưởng là đâu

Từ đó tính ra mức độ nguy hiểm: an toàn / cảnh báo / nguy hiểm.

#### Cách dev
Trong `Backend/services/injuryCalculator.js`:
- Dùng HIC₁₅ (Head Injury Criterion) để ước lượng chấn thương đầu.
- Dùng công thức impulse-momentum:
  F = m × Δv / Δt
- Dùng collision duration theo loại bề mặt:
  - kim loại / kính: thời gian va chạm ngắn => lực lớn
  - foam / mattress: thời gian dài => lực nhỏ hơn
- Dùng age-adjusted thresholds để điều chỉnh theo độ tuổi.
- Tính `gForce`, `impactForceN`, `hic15`, và `riskTier`.
- Có thêm mô hình “growth plate” / “physis yield” để phát hiện nguy cơ gãy xương ở trẻ nhỏ.

#### Công thức chính
- HIC: dựa trên gia tốc trung bình và khoảng thời gian va chạm.
- Impact Force: theo định luật chuyển động và xung lượng.
- Risk Score: tổng hợp HIC + lực va chạm + độ sắc nhọn + chiều cao rơi.

#### Vì sao quan trọng
- Đây là “trái tim phân tích rủi ro”.
- Mô hình này giúp mô phỏng không chỉ là “có va chạm”, mà còn là “va chạm nguy hiểm đến mức nào”.

---

### E. Thuật toán heatmap và báo cáo rủi ro (Risk Analytics)

#### Cách đơn giản
Hệ thống lập bản đồ vùng có nhiều tai nạn xảy ra nhất.
Ví dụ: nếu vùng gần bàn có nhiều sự kiện nguy hiểm, hệ thống sẽ đánh dấu đó là “hotspot”.

#### Cách dev
Trong `Backend/services/riskAnalytics.js`:
- Dùng grid 0.5m x 0.5m để chia phòng thành các ô.
- Mỗi lần xảy ra va chạm, tăng count và severity cho ô đó.
- Tổng hợp:
  - collision heatmap
  - near-miss report
  - accident summary
  - recommendation suggestions
- Tự sinh báo cáo để frontend hiển thị hoặc export.

#### Vì sao quan trọng
- Trợ giúp người dùng nhận diện nơi cần sửa đổi môi trường.
- Từ dữ liệu va chạm, hệ thống tạo ra insight hành động.

---

### F. Thuật toán phân loại và định vị cơ thể (body-part detection)

#### Cách đơn giản
Hệ thống không chỉ biết “trẻ va chạm”, mà còn biết “đầu, tay, chân, vai bị va chạm”.
Đây là thông tin cực kỳ quan trọng vì mỗi vùng cơ thể có mức độ nguy hiểm khác nhau.

#### Cách dev
Trong `injuryCalculator.js`, hàm `determineBodyPart()`:
- Dùng vị trí va chạm theo trục Y và chiều cao của trẻ để tính phần cơ thể.
- Nếu va chạm nằm ở vùng cao => head / shoulder / torso.
- Nếu ở vùng thấp => arm / legs.
- Có logic đặc biệt cho FOOSH (fall on outstretched hand), tức trẻ té mà dùng tay chống.

#### Vì sao quan trọng
- Vì gãy tay, gãy vai, chấn thương đầu có nguy cơ khác nhau.
- Đây là phần làm cho hệ thống có độ chính xác y sinh học hơn.

---

## 4. Ngôn ngữ lập trình và công nghệ đã sử dụng

### Ngôn ngữ lập trình chính
- JavaScript (ES Modules): dùng chủ yếu ở backend (`.js`) và các script automation.
- TypeScript: dùng ở frontend React/Vite để tăng tính an toàn kiểu dữ liệu.
- HTML/CSS: giao diện và cấu trúc trang web.
- Tailwind CSS: styling utility-first.
- JSON / dotenv / package manifests: cấu hình và môi trường.
- Shell script (`.cmd`, `.sh`): chạy dev server và setup môi trường.
- Markdown: tài liệu và hướng dẫn.

### Backend stack
- Node.js: runtime chính.
- Express 5: framework API.
- Mongoose + MongoDB: lưu trữ dữ liệu người dùng.
- Rapier3D: physics engine.
- Google Generative AI: AI behavior generation.
- Multer: tải file GLB/GLTF.
- Helmet / CORS / express-rate-limit: bảo mật và giới hạn request.
- Morgan: logging.

### Frontend stack
- React 18
- Vite 6
- Three.js
- @react-three/fiber
- @react-three/drei
- Tailwind CSS
- Framer Motion / GSAP
- XLSX / jspdf / file-saver

### Kỹ thuật / pattern đã dùng
- Event-driven simulation
- Async background processing
- Cache + timeout + retry cho AI call
- Collision group optimization
- Heuristic-based object classification
- Matrix math / quaternion math for GLB world transforms
- Farthest-point sampling for mesh simplification
- Heatmap aggregation
- Age-adjusted pediatric injury scoring

---

## 5. Công nghệ nào dùng để làm gì

| Công nghệ | Mục đích chính |
|---|---|
| Node.js | Chạy backend và logic simulation |
| Express | Tạo API và xử lý request |
| Rapier3D | Xử lý vật lý, collider, collision event |
| GLTF Transform | Parse file GLB/GLTF và đọc mesh dữ liệu |
| Gemini API | Tạo hành vi AI cho agent |
| React + TypeScript | UI và logic frontend |
| Vite | Dev server và build tool |
| Three.js | Render scene 3D |
| Tailwind CSS | Thiết kế giao diện |
| XLSX / jsPDF | Xuất báo cáo |
| MongoDB / Mongoose | Lưu session, user và dữ liệu nền |

---

## 6. Tóm tắt hoàn chỉnh theo 2 cách

### Cách đơn giản nhất
Hệ thống gồm 4 phần chính:
1. Đọc mô hình phòng và đo kích thước đồ vật (BBox / mesh).
2. Tạo lớp vật lý xung quanh đồ vật (collider).
3. Cho trẻ di chuyển và va chạm theo độ tuổi.
4. Tính mức nguy hiểm và vẽ nhiệt đồ vùng tai nạn.

### Cách dev
Pipeline thực tế là:
- GLB parse → object classification → collider generation → physics world → agent behavior → injury scoring → heatmap/report.

---

## 7. Tóm tắt tổng kết
Project này không chỉ dùng một công nghệ đơn lẻ, mà là sự kết hợp của:
- JavaScript / TypeScript
- Node.js / Express
- Rapier3D vật lý 3D
- Gemini AI
- Three.js render
- heuristic + math-based collision logic

Đây là một hệ thống simulation full-stack có tính toán khoa học, có AI, có vật lý và có báo cáo trực quan.

---

## 8. Cách hệ thống “vận hành” theo một câu chuyện đơn giản
Giả sử người dùng tải một phòng có bàn, ghế, cửa và trẻ 2 tuổi.
1. Hệ thống đọc mô hình phòng.
2. Chọn hành vi trẻ 2 tuổi: đi lại, kéo đồ, trèo ghế, ngã.
3. Vật lý 3D bắt đầu mô phỏng từng bước.
4. Khi trẻ va vào bàn hoặc ngã, hệ thống đo tốc độ và lực va chạm.
5. Hệ thống tính ra điểm chấn thương.
6. Hệ thống đánh dấu ô nóng trên map.
7. Người dùng nhìn thấy kết quả và quyết định nên đổi chỗ bàn/ghế hay không.

---

## 9. Tóm tắt ngắn gọn cho người không biết code
Nếu bỏ qua mọi thuật ngữ kỹ thuật, hệ thống này làm 3 việc chính:
1. Cho trẻ “di chuyển” trong phòng 3D.
2. Đo xem trẻ có va chạm / ngã / chấn thương không.
3. Cho biết đâu là vùng nguy hiểm nhất.

---

## 10. Tóm tắt dành cho dev
Thiết kế chính của hệ thống là:
- Frontend UI → API → Simulation Controller → PhysicsEngine + BehaviorManager → InjuryCalculator + RiskAnalytics → Report/Heatmap.

Đây là mô hình “simulation pipeline” hiện đại:
- input scene
- generate agent policy
- run physics step
- compute collision risk
- aggregate insights

---

## 11. Kết luận
Project này không chỉ là một ứng dụng web đơn thuần, mà là một hệ thống mô phỏng an toàn trẻ em có tích hợp:
- vật lý 3D
- AI hành vi
- phân tích rủi ro
- báo cáo trực quan

Nếu hiểu được các thành phần trên, bạn sẽ hiểu được “bộ não” của toàn bộ hệ thống.
