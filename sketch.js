let charImageDefault, charImageActive; // 角色1的預設與活動圖片
let bgImage; // 背景圖片
let spriteSheet3; // NPC 的 sprite sheet
let spriteSheet4; // NPC 微笑動畫的 sprite sheet
let frames3 = []; // NPC 的幀
let frames4 = []; // NPC 微笑動畫的幀

// NPC 角色 3 的設定
const FRAME3_W = Math.floor(699 / 8); // 圖片寬度 699 / 8 幀，使用 floor 確保為整數
const FRAME3_H = 190;     // 圖片高度 190
const TOTAL_FRAMES3 = 8;
let currentFrame3 = 0;
let animTimer3 = 0;

// NPC 角色 3 微笑動畫的設定
const FRAME4_W = Math.floor(585 / 5); // 圖片寬度 585 / 5 幀
const FRAME4_H = 183;     // 圖片高度 183
const TOTAL_FRAMES4 = 5;
let currentFrame4 = 0;
let animTimer4 = 0;
let char3Pos; // 新角色的位置

// 角色位置與跳躍狀態
let charPos;
let isJumping = false;
let jumpProgress = 0;
const JUMP_HEIGHT = 200; // 跳躍高度
const JUMP_SPEED = 0.05; // 跳躍動畫速度
const MOVE_SPEED = 5; // 左右移動速度
const PROXIMITY_THRESHOLD = 150; // 判定為「靠近」的距離閾值

// 煙火特效
let fireworks = [];

// --- 問答遊戲變數 ---
let quizTable;
let quiz = [];
let currentQuestion = null;
let quizState = 'idle'; // 'idle', 'asking', 'answered'
let feedbackText = '';
let feedbackTimer = 0;
const FEEDBACK_DISPLAY_TIME = 3000;

const ANIM_FPS = 2; // 動畫幀率 (每秒2幀，即每0.5秒換一張)

function preload() {
  // 為了瀏覽器相容性，使用相對路徑
  bgImage = loadImage('6/0.png', null, () => { console.warn("背景圖片遺失: 6/0.png"); });
  charImageDefault = loadImage('1/0.png');
  charImageActive = loadImage('2/0.png');
  
  // 加入錯誤處理 callback (第三個參數)，防止因為 404 導致 p5.js 拋出錯誤事件
  spriteSheet3 = loadImage('5/stops/all.png', null, () => { console.warn("NPC圖片載入失敗: 5/stops/all.png"); });
  spriteSheet4 = loadImage('5/smile/all.png', null, () => { console.warn("NPC微笑圖片載入失敗: 5/smile/all.png"); });

  // 載入題庫
  quizTable = loadTable('quiz_mc.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 初始化主要角色位置
  charPos = { x: width / 2, y: height / 2 };
  // 初始化NPC的固定位置
  char3Pos = { x: width / 2 - 260 - 50, y: height / 2 }; // 使用一個大概的寬度值

  // 處理題庫
  if (quizTable) {
    for (let row of quizTable.rows) {
      quiz.push({
        question: row.getString('題目'),
        options: {
          a: row.getString('選項A'),
          b: row.getString('選項B'),
          c: row.getString('選項C'),
          d: row.getString('選項D')
        },
        answer: row.getString('答案'),
        correctFeedback: row.getString('答對回饋'),
        wrongFeedback: row.getString('答錯回饋')
      });
    }
  }

  // 裁切NPC的 Sprite Sheet (水平)
  // 檢查圖片是否成功載入 (寬度 > 1)
  if (spriteSheet3 && spriteSheet3.width > 1) {
    for (let i = 0; i < TOTAL_FRAMES3; i++) {
      const x = i * FRAME3_W;
      frames3.push(spriteSheet3.get(x, 0, FRAME3_W, FRAME3_H));
    }
  } else {
    // 圖片載入失敗時的備案：確保 frames3 絕對不為空
    console.warn("NPC 圖片 (5/stops/all.png) 載入失敗，使用備用圖片。");
    if (charImageDefault && charImageDefault.width > 1) {
      frames3.push(charImageDefault);
    } else {
      // 如果連備用圖片都沒有，畫一個紅色方塊確保程式不崩潰且看得到 NPC
      let pg = createGraphics(FRAME3_W, FRAME3_H);
      pg.background(200, 100, 100);
      pg.textAlign(CENTER, CENTER);
      pg.text("NPC", FRAME3_W/2, FRAME3_H/2);
      frames3.push(pg);
    }
  }

  // 裁切NPC微笑動畫的 Sprite Sheet (水平)
  if (spriteSheet4 && spriteSheet4.width > 1) {
    for (let i = 0; i < TOTAL_FRAMES4; i++) {
      const x = i * FRAME4_W;
      frames4.push(spriteSheet4.get(x, 0, FRAME4_W, FRAME4_H));
    }
  } else {
    // 微笑圖片載入失敗時的備案
    if (charImageActive && charImageActive.width > 1) {
      frames4.push(charImageActive);
    } else if (frames3.length > 0) {
      // 如果沒有微笑圖，就用一般圖頂替，確保互動時不會消失
      frames4.push(frames3[0]);
    }
  }

  // 確保幀索引在範圍內
  if (frames3.length > 0) currentFrame3 = currentFrame3 % frames3.length;
  if (frames4.length > 0) currentFrame4 = currentFrame4 % frames4.length;
}

let isInteracting = false; // 新增：互動狀態鎖

function draw() {
  // background(173, 216, 230);

  // 繪製背景圖片，並等比例縮放填滿視窗 (Cover 效果)
  if (bgImage && bgImage.width > 1 && bgImage.height > 1) {
    let scale = Math.max(width / bgImage.width, height / bgImage.height);
    imageMode(CENTER);
    image(bgImage, width / 2, height / 2, bgImage.width * scale, bgImage.height * scale);
  } else {
    background(173, 216, 230); // 如果圖片未載入，顯示原本的背景色
  }

  imageMode(CENTER);

  let currentImage;
  let isFlipped = false;

  // 優先處理跳躍狀態
  if (keyIsDown(UP_ARROW) && !isJumping) {
    isJumping = true;
    jumpProgress = 0;
  }

  // 根據狀態決定主要角色使用的圖片和位置
  if (isJumping) {
    currentImage = charImageActive; // 使用活動圖片
    jumpProgress += JUMP_SPEED;
    charPos.y = (height / 2) - JUMP_HEIGHT * sin(jumpProgress * PI);
    if (jumpProgress >= 1) {
      isJumping = false;
      jumpProgress = 0;
      charPos.y = height / 2;
    }
  } else if (keyIsDown(LEFT_ARROW)) {
    currentImage = charImageActive; // 使用活動圖片
    charPos.x -= MOVE_SPEED;
    charPos.x = max(currentImage.width / 2, charPos.x);
    isFlipped = true;
  } else if (keyIsDown(RIGHT_ARROW)) {
    currentImage = charImageActive; // 使用活動圖片
    charPos.x += MOVE_SPEED;
    charPos.x = min(width - currentImage.width / 2, charPos.x);
    isFlipped = false; // 往右走不翻轉
  } else {
    currentImage = charImageDefault; // 使用預設圖片
  }

  // --- 繪製主要角色 (如果圖片已載入) ---
  if (currentImage) {
      push();
      translate(charPos.x, charPos.y);
      if (isFlipped) {
        scale(-1, 1);
      }
      image(currentImage, 0, 0);
      pop();
  }

  // --- 繪製新角色 (NPC) ---
  if (frames3.length > 0) {
      let newCharImage;
      let isChar3Flipped = false;

      const distance = dist(charPos.x, charPos.y, char3Pos.x, char3Pos.y);
      if (distance < PROXIMITY_THRESHOLD) {
        isInteracting = true;
        if (quizState === 'idle' && quiz.length > 0) {
          quizState = 'asking';
          currentQuestion = random(quiz);
        }
      } else {
        isInteracting = false;
        quizState = 'idle';
        currentQuestion = null;
      }

      if (isInteracting) {
        newCharImage = frames4[currentFrame4];
        if (quizState === 'asking' && currentQuestion) {
          drawSpeechBubble(char3Pos, currentQuestion, FRAME3_H);
          drawAnswerPrompt();
        } else if (quizState === 'answered') {
          drawSpeechBubble(char3Pos, feedbackText, FRAME3_H);
          if (millis() - feedbackTimer > FEEDBACK_DISPLAY_TIME) {
             quizState = 'idle';
             currentQuestion = null;
             charPos.x = width / 2;
             charPos.y = height / 2;
          }
        }
      } else {
        newCharImage = frames3[currentFrame3];
      }

      // 如果主要角色在角色三的右邊，則翻轉角色三
      if (charPos.x > char3Pos.x) {
          isChar3Flipped = true;
      }

      // 使用 push/pop 獨立繪製，避免座標系互相影響
      push();
      translate(char3Pos.x, char3Pos.y);
      if (isChar3Flipped) {
          scale(-1, 1);
      }
      image(newCharImage, 0, 0);
      pop();
  }

  // --- 更新所有角色的動畫幀 ---
  updateAnimationFrames();

  // --- 更新並繪製煙火 ---
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].show();
    if (fireworks[i].done()) {
      fireworks.splice(i, 1);
    }
  }
}

function updateAnimationFrames() {
  const frameDuration = 1000 / ANIM_FPS;

  // 只更新 NPC 的動畫
  if (isInteracting) {
      animTimer4 += deltaTime;
      if (animTimer4 >= frameDuration && frames4.length > 0) {
          currentFrame4 = (currentFrame4 + 1) % frames4.length;
          animTimer4 = 0;
      }
  } else {
      animTimer3 += deltaTime;
      if (animTimer3 >= frameDuration && frames3.length > 0) {
          currentFrame3 = (currentFrame3 + 1) % frames3.length;
          animTimer3 = 0;
      }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 視窗大小改變時，重設角色位置
  charPos = { x: width / 2, y: height / 2 };
  // 重設新角色的固定位置
  char3Pos = { x: width / 2 - 260 - 50, y: height / 2 };
}

function keyPressed() {
  // 當按下空白鍵時
  if (key === ' ') {
    // 在螢幕最左邊和最右邊各產生一個煙火
    // 煙火的垂直位置隨機，使其更有趣
    let yPos = random(height * 0.2, height * 0.7); // 調整垂直位置範圍
    fireworks.push(new Firework(width * 0.2, yPos)); // 離左邊界 20% 寬度
    fireworks.push(new Firework(width * 0.8, yPos)); // 離右邊界 20% 寬度
  }
  
  // 處理答題
  if (isInteracting && quizState === 'asking') {
    let keyName = key.toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(keyName)) {
      handleAnswerSubmit(keyName.toUpperCase());
    }
  }
}

// ==================================
//  煙火特效的 Class (類別)
// ==================================

/**
 * 代表單一煙火爆炸的 Class
 */
class Firework {
  constructor(x, y) {
    this.particles = [];
    // 隨機產生一個鮮豔的顏色
    this.color = color(random(180, 255), random(180, 255), random(180, 255));
    this.explode(x, y);
  }

  // 在指定位置產生 120 個粒子來模擬爆炸
  explode(x, y) {
    for (let i = 0; i < 120; i++) {
      this.particles.push(new Particle(x, y, this.color));
    }
  }

  // 更新所有粒子的狀態
  update() {
    for (let particle of this.particles) {
      particle.update();
    }
  }

  // 繪製所有粒子
  show() {
    for (let particle of this.particles) {
      particle.show();
    }
  }

  // 如果所有粒子都消失了，則回傳 true
  done() {
    return this.particles.every(p => p.isDone());
  }
}

/**
 * 代表單一粒子的 Class
 */
class Particle {
  constructor(x, y, fireworkColor) {
    this.pos = createVector(x, y);
    // 讓粒子朝隨機方向以不同速度散開
    this.vel = p5.Vector.random2D().mult(random(1, 7));
    this.lifespan = 255; // 生命值，用來控制透明度
    this.color = fireworkColor;
    this.acc = createVector(0, 0.08); // 模擬重力
  }

  // 更新粒子的位置和生命值
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 4;
  }

  // 繪製粒子
  show() {
    // 生命值越低，粒子越透明
    noStroke();
    fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.lifespan);
    ellipse(this.pos.x, this.pos.y, 6, 6); // 讓粒子更大更明顯
  }

  // 如果生命值耗盡，則回傳 true
  isDone() {
    return this.lifespan < 0;
  }
}

function handleAnswerSubmit(answer) {
  if (!currentQuestion) return;
  
  if (answer === currentQuestion.answer) {
    feedbackText = currentQuestion.correctFeedback;
    // 答對放煙火
    fireworks.push(new Firework(width * 0.5, height * 0.3));
  } else {
    feedbackText = currentQuestion.wrongFeedback;
  }
  quizState = 'answered';
  feedbackTimer = millis();
}

function drawSpeechBubble(pos, content, charH) {
  push();
  let textStr = "";
  if (typeof content === 'string') {
    textStr = content;
  } else {
    textStr = `Q: ${content.question}\n(A) ${content.options.a}\n(B) ${content.options.b}\n(C) ${content.options.c}\n(D) ${content.options.d}`;
  }
  
  textSize(16);
  // 簡單計算寬度
  let lines = textStr.split('\n');
  let maxW = 0;
  for(let line of lines) maxW = max(maxW, textWidth(line));
  let w = maxW + 40;
  
  let h = lines.length * 24 + 30;
  let x = pos.x - w / 2;
  let y = pos.y - charH / 2 - h - 20;
  
  fill(255);
  stroke(0);
  strokeWeight(2);
  rect(x, y, w, h, 10);
  
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  text(textStr, x + 20, y + 20);
  pop();
}

function drawAnswerPrompt() {
  push();
  const promptText = "請按 A, B, C, D 作答";
  textSize(14);
  textStyle(BOLD);
  
  const textW = textWidth(promptText);
  const boxW = textW + 20;
  const boxH = 30;
  
  // 取得角色高度以計算對話框位置 (預設 100)
  let charH = 100;
  if (charImageDefault && charImageDefault.height > 1) {
    charH = charImageDefault.height;
  }
  
  // 位置在角色腳下 (避免與 NPC 頭上的題目框重疊)
  const boxX = charPos.x - boxW / 2;
  const boxY = charPos.y + (charH / 2) + 15;

  // 畫對話框背景
  fill(255);
  stroke(0);
  strokeWeight(1);
  rect(boxX, boxY, boxW, boxH, 5);
  
  // 畫上方小三角形指標 (指向角色)
  triangle(charPos.x - 5, boxY, 
           charPos.x + 5, boxY, 
           charPos.x, boxY - 6);

  // 畫文字
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  text(promptText, charPos.x, boxY + boxH / 2);
  pop();
}