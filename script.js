//Handle Signup
function signup(event) {
  event.preventDefault();
  const form = event.target;
  const signupButton = form.querySelector('button[type="submit"]');
  const originalButtonText = signupButton.innerText;

  // Disable button to prevent multiple submissions
  signupButton.disabled = true;
  signupButton.innerText = 'Signing Up...';

  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const role = document.querySelector('input[name="role"]:checked').value;
  
  // Create user with Firebase Auth
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User created successfully. Now save additional info to Firestore.
      const user = userCredential.user;
      const userProfile = {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        courses: []
      };

      // Add role-specific fields
      if (role === 'student') {
        userProfile.college = document.getElementById('college').value;
        userProfile.course = document.getElementById('course').value;
        userProfile.year = document.getElementById('year').value;
        userProfile.mobile = document.getElementById('mobile').value;
      } else if (role === 'tutor') {
        userProfile.subject = document.getElementById('subject').value;
        userProfile.age = document.getElementById('age').value;
        userProfile.experience = document.getElementById('experience').value;
      }

      // Set the document in Firestore with the user's UID as the doc ID
      return db.collection('users').doc(user.uid).set(userProfile);
    })
    .then(() => {
      // On success, redirect to the login page
      window.location.href = "login.html";
    })
    .catch((error) => {
      alert(`Error: ${error.message}`);
      console.error("Signup Error:", error);
      // Re-enable the button on error
      signupButton.disabled = false;
      signupButton.innerText = originalButtonText;
    });
}

//Handle Login
function login(event) {
  event.preventDefault();
  const form = event.target;
  const loginButton = form.querySelector('button[type="submit"]');
  const originalButtonText = loginButton.innerText;

  // Disable button to prevent multiple submissions
  loginButton.disabled = true;
  loginButton.innerText = 'Logging In...';

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const role = document.querySelector('input[name="role"]:checked').value;

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed in, now verify the role from Firestore
      return db.collection('users').doc(userCredential.user.uid).get();
    })
    .then((doc) => {
      if (doc.exists && doc.data().role === role) {
        // Role matches, login is successful. Redirect to the correct dashboard.
        if (role === 'tutor') {
          window.location.href = "tutor-dashboard.html";
        } else {
          window.location.href = "dashboard.html";
        }
      } else {
        // Role does not match or doc doesn't exist
        auth.signOut(); // Log out the user
        const correctRole = doc.exists ? doc.data().role : 'an unknown role';
        alert(`Login failed. You are trying to log in as a ${role}, but you are registered as a ${correctRole}.`);
        // Re-enable button on failure
        loginButton.disabled = false;
        loginButton.innerText = originalButtonText;
      }
    })
    .catch((error) => {
      alert(`Error: ${error.message}`);
      console.error("Login Error:", error);
      // Re-enable button on error
      loginButton.disabled = false;
      loginButton.innerText = originalButtonText;
    });
}

//Load Dashboard Info
function loadDashboard() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in, get their data from Firestore
      db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          const userData = doc.data();
          // Welcome message
          document.getElementById("welcomeUser").innerText = `Welcome, ${userData.name}!`;

          // Enrolled Courses Panel
          const enrolledCoursesList = document.getElementById("enrolledCourses");
          if (enrolledCoursesList) {
            enrolledCoursesList.innerHTML = "";
            if (!userData.courses || userData.courses.length === 0) {
              enrolledCoursesList.innerHTML = "<li><p>No courses enrolled yet. You can enroll from the <a href='courses.html'>Courses</a> page.</p></li>";
            } else {
              userData.courses.forEach(course => {
                let li = document.createElement("li");
                li.innerText = course;
                enrolledCoursesList.appendChild(li);
              });
            }
          }

          // Profile Panel
          const userProfileDiv = document.getElementById("userProfile");
          if (userProfileDiv) {
            let profileHTML = `
              <p><strong>Full Name:</strong> <span>${userData.name}</span></p>
              <p><strong>Email:</strong> <span>${userData.email}</span></p>
              <p><strong>Role:</strong> <span>${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</span></p>
            `;
            if (userData.role === 'student') {
              profileHTML += `
                <p><strong>College:</strong> <span>${userData.college || 'N/A'}</span></p>
                <p><strong>Course:</strong> <span>${userData.course || 'N/A'}</span></p>
                <p><strong>Year:</strong> <span>${userData.year || 'N/A'}</span></p>
                <p><strong>Mobile:</strong> <span>${userData.mobile || 'N/A'}</span></p>
              `;
            } else if (userData.role === 'tutor') {
              profileHTML += `
                <p><strong>Subject:</strong> <span>${userData.subject || 'N/A'}</span></p>
                <p><strong>Age:</strong> <span>${userData.age || 'N/A'}</span></p>
                <p><strong>Experience:</strong> <span>${userData.experience || 'N/A'} years</span></p>
              `;
            }
            userProfileDiv.innerHTML = profileHTML;
          }
        } else {
          // Doc doesn't exist, something is wrong. Log out.
          console.error("User document not found in Firestore!");
          logout();
        }
      }).catch(error => {
        console.error("Error fetching user data:", error);
        logout();
      });
    } else {
      // No user is signed in, redirect to login page
      window.location.href = "login.html";
    }
  });
}

//Enroll in Course
function enroll(courseName) {
  const user = auth.currentUser;
  if (user) {
    const userRef = db.collection('users').doc(user.uid);
    // Atomically add a new course to the "courses" array field.
    userRef.update({
      courses: firebase.firestore.FieldValue.arrayUnion(courseName)
    }).then(() => {
      alert(`You have successfully enrolled in ${courseName}!`);
    }).catch(error => {
      console.error("Error enrolling in course: ", error);
    });
  } else {
    alert("Please login first to enroll in a course.");
    window.location.href = "login.html";
  }
}

//Logout
function logout() {
  auth.signOut().then(() => {
    window.location.href = "../index.html";
  }).catch((error) => {
    console.error("Logout Error:", error);
  });
}

// Dashboard Panel Switching
function showPanel(panelId) {
  // Hide all content panels
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Deactivate all sidebar links
  document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.classList.remove('active');
  });

  // Show the selected panel
  const panelToShow = document.getElementById(`${panelId}-panel`);
  if (panelToShow) panelToShow.classList.add('active');

  // Activate the clicked sidebar link
  const linkToActivate = document.querySelector(`.sidebar nav a[onclick="showPanel('${panelId}')"]`);
  if (linkToActivate) linkToActivate.classList.add('active');
}

// Attach event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Logic for the courses page
  if (document.body.classList.contains('courses-page')) {
    const enrollButtons = document.querySelectorAll('.enrollBtn');
    enrollButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const courseName = event.target.getAttribute('data-course');
        enroll(courseName);
      });
    });
  }

  // Logic for the dashboard page (if it exists)
  if (document.body.classList.contains('dashboard-page')) {
      loadDashboard();
  }
});