// 📌 서버에서 게시글 불러오기
async function loadPosts() {
  const response = await fetch(`${API_URL}/posts`);
  const posts = await response.json();

  postList.innerHTML = ""; // 기존 게시글 초기화
  posts.forEach((post) => createPostElement(post));
}

// 📌 클라이언트에서 base64 변환 및 업로드
async function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      console.log("✅ Base64 변환 성공:", reader.result.substring(0, 100)); // Base64 앞 100자 확인
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      console.error("🛑 Base64 변환 오류:", error);
      reject(error);
    };
  });
}

// 📌 게시글 저장 (이미지 base64 변환 후 Supabase DB 저장)
async function savePost(title, content, imageFile) {
  let imageUrl = null;

  // ✅ 현재 로그인된 사용자 정보 가져오기
  const { data: sessionData, error } = await supabase.auth.getSession();

  if (error || !sessionData?.session) {
    alert("로그인이 필요합니다!");
    return;
  }

  const access_token = sessionData.session.access_token;
  const user_id = sessionData.session.user.id; // ✅ user_id 가져오기

  if (imageFile) {
    imageUrl = await convertToBase64(imageFile);
  }

  const response = await fetch(`${API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`, // ✅ Authorization 헤더 추가
    },
    body: JSON.stringify({ title, content, image_url: imageUrl, user_id }),
  });

  const responseData = await response.json();
  console.log("📌 API 응답:", responseData); // ✅ API 응답 확인

  if (response.ok) {
    loadPosts();
  } else {
    alert(`게시글 저장 실패! 오류: ${responseData.error}`);
  }
}

// 📌 서버에서 게시글 수정하기 (updated_at 반영)
async function updatePost(postId) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const title = document.getElementById(`edit-title-${postId}`).value;
  const content = document.getElementById(`edit-content-${postId}`).value;
  const imageFile = document.getElementById(`edit-image-${postId}`).files[0];

  let imageUrl =
    document.getElementById(`current-image-${postId}`)?.src || null;
  if (imageFile) {
    imageUrl = await convertToBase64(imageFile);
  }

  const response = await fetch(`${API_URL}/posts/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, image_url: imageUrl }),
  });

  if (response.ok) {
    loadPosts();
  } else {
    alert("게시글 수정 실패!");
  }
}

async function deleteImage(postId) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const confirmDelete = confirm("이미지를 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const response = await fetch(`${API_URL}/posts/${postId}/image`, {
    method: "DELETE",
  });

  if (response.ok) {
    loadPosts();
  } else {
    alert("이미지 삭제 실패!");
  }
}

// 📌 서버에서 게시글 삭제하기
async function deletePost(postId) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const confirmDelete = confirm("정말로 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const response = await fetch(`${API_URL}/posts/${postId}`, {
    method: "DELETE",
  });

  if (response.ok) {
    loadPosts();
  } else {
    alert("게시글 삭제 실패!");
  }
}

// 📌 댓글 추가하기
async function addComment(board_id) {
  const user_id = await checkAuth(); // ✅ 로그인 체크
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료

  const commentInput = document.getElementById(`comment-input-${board_id}`);
  const content = commentInput.value.trim();
  if (!content) return;

  const response = await fetch(`${API_URL}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board_id, content }),
  });

  const responseData = await response.json();
  console.log("📌 API 응답:", responseData); // ✅ API 응답 확인

  if (response.ok) {
    loadComments(board_id);
  } else {
    alert(`댓글 작성 실패! 오류: ${responseData.error}`);
  }
}

// 📌 서버에서 댓글 수정하기
async function updateComment(commentId, board_id) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료
  const contentInput = document.getElementById(`edit-comment-${commentId}`);

  const newContent = contentInput.value.trim();
  if (!newContent) return alert("댓글 내용을 입력하세요.");

  await fetch(`${API_URL}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: newContent }),
  });

  loadComments(board_id); // 수정 후 해당 게시글의 댓글 다시 불러오기
}

// 📌 댓글 삭제하기
async function deleteComment(commentId, board_id) {
  const user_id = await checkAuth(); // ✅ 로그인 체크 추가
  if (!user_id) return; // ✅ 로그인되지 않으면 함수 종료
  await fetch(`${API_URL}/comments/${commentId}`, { method: "DELETE" });
  loadComments(board_id); // 다시 불러오기
}

// 📌 글 작성 이벤트 (이미지 업로드 추가)
postForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const title = document.getElementById("title").value;
  const content = document.getElementById("content").value;
  const imageFile = document.getElementById("image").files[0]; // 파일 선택

  if (!title || !content) return;

  await savePost(title, content, imageFile);

  // 입력 필드 초기화
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
  document.getElementById("image").value = "";
});

// 📌 게시글을 동적으로 생성하는 함수 (개선된 디자인 적용)
function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.classList.add("post-card"); // 게시글 카드 스타일 적용

  const createdDate = new Date(post.created_at).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const updatedDate = post.updated_at
    ? new Date(post.updated_at).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      })
    : null;
  const isUpdated = post.updated_at && post.updated_at !== post.created_at;

  let dateText = isUpdated
    ? `<div class="post-updated">✏ 수정됨: ${updatedDate}</div>`
    : `<div class="post-date">📅 작성일: ${createdDate}</div>`;

  let imageTag = post.image_url
    ? `<div class="post-image"><img src="${post.image_url}" alt="게시물 이미지"></div>`
    : "";

  postDiv.innerHTML = `
      <div class="post-content">
          ${imageTag}
          <h3 class="post-title">${post.title}</h3>
          <p class="post-text">${post.content}</p>
          ${dateText}
          <div class="post-actions">
              <button class="edit-btn" onclick="enableEditMode('${post.id}')">✏ 수정</button>
              <button class="delete-btn" onclick="deletePost('${post.id}')">🗑 삭제</button>
          </div>
      </div>
      <div class="comments-section">
          <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="댓글을 입력하세요">
          <button class="comment-btn" onclick="addComment('${post.id}')">💬 댓글 작성</button>
          <div class="comments" id="comments-${post.id}"></div>
      </div>
    `;

  postList.appendChild(postDiv);
  loadComments(post.id);
}

// 📌 특정 게시글의 댓글 불러오기 (작성 & 수정 날짜 포함)
async function loadComments(board_id) {
  const response = await fetch(`${API_URL}/comments?board_id=${board_id}`);
  const comments = await response.json();

  const commentsDiv = document.getElementById(`comments-${board_id}`);
  commentsDiv.innerHTML = ""; // 기존 댓글 초기화

  comments.forEach((comment) => {
    const createdDate = new Date(comment.created_at).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    const updatedDate = comment.updated_at
      ? new Date(comment.updated_at).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        })
      : null;
    const isUpdated =
      comment.updated_at && comment.updated_at !== comment.created_at;

    let dateText = isUpdated
      ? `<div class="comment-updated">✏ 수정: ${updatedDate}</div>`
      : `<div class="comment-date">📅 작성: ${createdDate}</div>`;

    const commentElement = document.createElement("div");
    commentElement.classList.add("comment-box");
    commentElement.innerHTML = `
        <div id="view-comment-${comment.id}">
            <p class="comment-content">${comment.content}</p>
            ${dateText}
            <div class="comment-actions">
                <button class="edit-btn" onclick="enableCommentEditMode('${comment.id}', '${comment.content}')">✏ 수정</button>
                <button class="delete-btn" onclick="deleteComment('${comment.id}', '${board_id}')">🗑 삭제</button>
            </div>
        </div>
  
        <div id="edit-comment-mode-${comment.id}" style="display: none;">
            <input type="text" id="edit-comment-${comment.id}" class="comment-edit-input" value="${comment.content}">
            <button class="save-btn" onclick="updateComment('${comment.id}', '${board_id}')">💾 저장</button>
            <button class="cancel-btn" onclick="disableCommentEditMode('${comment.id}')">❌ 취소</button>
        </div>
      `;
    commentsDiv.appendChild(commentElement);
  });
}

// 📌 수정 모드 활성화
function enableEditMode(postId, title, content) {
  document.getElementById(`view-mode-${postId}`).style.display = "none";
  document.getElementById(`edit-mode-${postId}`).style.display = "block";
}

// 📌 수정 모드 취소
function disableEditMode(postId) {
  document.getElementById(`view-mode-${postId}`).style.display = "block";
  document.getElementById(`edit-mode-${postId}`).style.display = "none";
}

// 📌 댓글 수정 모드 활성화
function enableCommentEditMode(commentId, content) {
  document.getElementById(`view-comment-${commentId}`).style.display = "none";
  document.getElementById(`edit-comment-mode-${commentId}`).style.display =
    "block";
}

// 📌 댓글 수정 모드 취소
function disableCommentEditMode(commentId) {
  document.getElementById(`view-comment-${commentId}`).style.display = "block";
  document.getElementById(`edit-comment-mode-${commentId}`).style.display =
    "none";
}

// 📌 페이지 로드 시 게시글 불러오기
window.onload = loadPosts;
