const loginPage = "login.html";
const savedProfileKey = "shapehubUserProfile";
const savedGoalsKey = "shapehubUserGoals";
const savedWorkoutKey = "shapehubSavedWorkout";
const savedThemeKey = "shapehubTheme";
const savedAuthKey = "shapehubAuthUser";
let currentGeneratedWorkout = null;

const defaultUserProfile = {
    name: "Micael Santos",
    age: "19",
    height: "176",
    weight: "72",
    type: "Retomada",
    goal: "Ganhar massa",
    availability: "45 min por treino",
    target: "+3 kg de massa magra",
    image: ""
};

function applyTheme(theme) {
    const isLight = theme === "light";

    document.body.classList.toggle("light-theme", isLight);
    document.querySelectorAll("[data-theme-toggle]").forEach(function(button) {
        button.setAttribute("aria-label", isLight ? "Ativar tema escuro" : "Ativar tema claro");
        button.setAttribute("title", isLight ? "Tema claro" : "Tema escuro");
    });
}

function setupThemeToggle() {
    const savedTheme = localStorage.getItem(savedThemeKey) || "dark";

    applyTheme(savedTheme);

    document.querySelectorAll("[data-theme-toggle]").forEach(function(button) {
        button.addEventListener("click", function() {
            const nextTheme = document.body.classList.contains("light-theme") ? "dark" : "light";

            button.classList.remove("is-switching");
            void button.offsetWidth;
            button.classList.add("is-switching");
            localStorage.setItem(savedThemeKey, nextTheme);
            applyTheme(nextTheme);

            window.setTimeout(function() {
                button.classList.remove("is-switching");
            }, 440);
        });
    });
}

function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function(part) {
            return part.charAt(0).toUpperCase();
        })
        .join("") || "SH";
}

function formatHeight(value) {
    const height = Number(value);

    if (!height) {
        return "--";
    }

    return (height / 100).toFixed(2).replace(".", ",") + " m";
}

function calculateBmi(weightValue, heightValue) {
    const weight = Number(weightValue);
    const height = Number(heightValue) / 100;

    if (!weight || !height) {
        return "--";
    }

    return (weight / (height * height)).toFixed(1).replace(".", ",");
}

function getSavedProfile() {
    const savedProfile = localStorage.getItem(savedProfileKey);

    if (!savedProfile) {
        return defaultUserProfile;
    }

    return Object.assign({}, defaultUserProfile, JSON.parse(savedProfile));
}

function getSavedAuthUser() {
    const savedAuth = localStorage.getItem(savedAuthKey);

    if (!savedAuth) {
        return null;
    }

    try {
        return JSON.parse(savedAuth);
    } catch (error) {
        return null;
    }
}

async function requestAuth(endpoint, user) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    });
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Não foi possível concluir a ação.");
    }

    return payload.user;
}

function saveLoggedUser(user) {
    localStorage.setItem(savedAuthKey, JSON.stringify(user));
    sessionStorage.setItem("shapehubSessionActive", "true");

    if (user.name) {
        const profile = Object.assign({}, getSavedProfile(), {
            name: user.name
        });

        localStorage.setItem(savedProfileKey, JSON.stringify(profile));
    }
}

function setupAuthState() {
    const savedUser = getSavedAuthUser();
    const isLoggedIn = Boolean(savedUser) && sessionStorage.getItem("shapehubSessionActive") === "true";
    const displayName = savedUser && savedUser.name ? savedUser.name : getSavedProfile().name;

    document.body.classList.toggle("is-logged-in", isLoggedIn);
    document.querySelectorAll("[data-login], [data-auth-guest]").forEach(function(element) {
        element.hidden = isLoggedIn;
    });
    document.querySelectorAll("[data-auth-user], [data-logout]").forEach(function(element) {
        element.hidden = !isLoggedIn;
    });
    document.querySelectorAll("[data-auth-user-name]").forEach(function(element) {
        element.textContent = displayName;
    });
    document.querySelectorAll("[data-logout]").forEach(function(button) {
        button.addEventListener("click", function() {
            sessionStorage.removeItem("shapehubSessionActive");
            window.location.href = loginPage;
        });
    });
}

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}

function renderAvatarElement(element, initials, image) {
    if (!element) {
        return;
    }

    element.innerHTML = "";

    if (image) {
        const img = document.createElement("img");
        img.src = image;
        img.alt = "Foto de perfil";
        element.appendChild(img);
        return;
    }

    element.textContent = initials;
}

function resizeProfileImage(file, callback) {
    const reader = new FileReader();

    reader.addEventListener("load", function() {
        const image = new Image();

        image.addEventListener("load", function() {
            const canvas = document.createElement("canvas");
            const size = 512;
            const context = canvas.getContext("2d");
            const sourceSize = Math.min(image.width, image.height);
            const sourceX = (image.width - sourceSize) / 2;
            const sourceY = (image.height - sourceSize) / 2;

            canvas.width = size;
            canvas.height = size;
            context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
            callback(canvas.toDataURL("image/jpeg", 0.86));
        });

        image.src = reader.result;
    });

    reader.readAsDataURL(file);
}

function fillProfileForm(profile) {
    const fields = {
        profileName: profile.name,
        profileAge: profile.age,
        profileHeight: profile.height,
        profileWeight: profile.weight,
        profileType: profile.type,
        profileGoal: profile.goal,
        profileAvailability: profile.availability,
        profileTarget: profile.target
    };

    Object.keys(fields).forEach(function(id) {
        const field = document.getElementById(id);

        if (field) {
            field.value = fields[id];
        }
    });
}

function renderUserProfile(profile) {
    const initials = getInitials(profile.name);
    const description = "Foco em " + profile.goal.toLowerCase() + ", perfil " + profile.type.toLowerCase() + " e disponibilidade de " + profile.availability + ".";

    renderAvatarElement(document.querySelector("[data-profile-avatar]"), initials, profile.image);
    setText("[data-profile-name]", profile.name);
    setText("[data-profile-description]", description);
    setText("[data-profile-age]", profile.age + " anos");
    setText("[data-profile-height]", formatHeight(profile.height));
    setText("[data-profile-weight]", profile.weight + " kg");
    setText("[data-profile-type]", profile.type);
    setText("[data-profile-goal]", profile.goal);
    setText("[data-profile-availability]", profile.availability);
    setText("[data-profile-bmi]", calculateBmi(profile.weight, profile.height));
    setText("[data-profile-target]", profile.target);

    document.querySelectorAll(".profile-avatar-link").forEach(function(avatar) {
        renderAvatarElement(avatar, initials, profile.image);
    });
}

function setupUserProfile() {
    const profileForm = document.getElementById("profileForm");
    const profileModal = document.getElementById("profileModal");
    const openProfileModalButton = document.querySelector("[data-open-profile-modal]");
    const closeProfileModalButtons = document.querySelectorAll("[data-close-profile-modal]");
    const profilePhoto = document.querySelector("[data-profile-avatar]");
    const profileImageInput = document.getElementById("profileImageInput");
    const profile = getSavedProfile();

    renderUserProfile(profile);
    fillProfileForm(profile);

    function openProfileModal() {
        if (!profileModal) {
            return;
        }

        fillProfileForm(getSavedProfile());
        profileModal.classList.add("is-open");
        profileModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        const firstField = document.getElementById("profileName");

        if (firstField) {
            firstField.focus();
        }
    }

    function closeProfileModal() {
        if (!profileModal) {
            return;
        }

        profileModal.classList.remove("is-open");
        profileModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }

    if (openProfileModalButton) {
        openProfileModalButton.addEventListener("click", openProfileModal);
    }

    closeProfileModalButtons.forEach(function(button) {
        button.addEventListener("click", closeProfileModal);
    });

    if (profileModal) {
        profileModal.addEventListener("click", function(event) {
            if (event.target === profileModal) {
                closeProfileModal();
            }
        });
    }

    if (profilePhoto && profileImageInput) {
        profilePhoto.addEventListener("click", function() {
            profileImageInput.click();
        });

        profileImageInput.addEventListener("change", function() {
            const file = profileImageInput.files[0];

            if (!file) {
                return;
            }

            resizeProfileImage(file, function(image) {
                const currentProfile = getSavedProfile();
                const updatedProfile = Object.assign({}, currentProfile, {
                    image: image
                });

                localStorage.setItem(savedProfileKey, JSON.stringify(updatedProfile));
                renderUserProfile(updatedProfile);
            });
        });
    }

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeProfileModal();
        }
    });

    if (!profileForm) {
        return;
    }

    profileForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const updatedProfile = {
            name: document.getElementById("profileName").value,
            age: document.getElementById("profileAge").value,
            height: document.getElementById("profileHeight").value,
            weight: document.getElementById("profileWeight").value,
            type: document.getElementById("profileType").value,
            goal: document.getElementById("profileGoal").value,
            availability: document.getElementById("profileAvailability").value,
            target: document.getElementById("profileTarget").value,
            image: getSavedProfile().image
        };

        localStorage.setItem(savedProfileKey, JSON.stringify(updatedProfile));
        renderUserProfile(updatedProfile);
        closeProfileModal();
    });
}

function setupUserGoals() {
    const goalChecks = document.querySelectorAll("[data-goal-check]");
    const goalsCount = document.querySelector("[data-goals-count]");

    if (!goalChecks.length) {
        return;
    }

    const savedGoals = JSON.parse(localStorage.getItem(savedGoalsKey) || "{}");

    function updateGoalsCount() {
        const checkedGoals = Array.from(goalChecks).filter(function(input) {
            return input.checked;
        }).length;

        if (goalsCount) {
            goalsCount.textContent = checkedGoals + "/" + goalChecks.length + " feitas";
        }
    }

    goalChecks.forEach(function(input) {
        input.checked = Boolean(savedGoals[input.dataset.goalCheck]);

        input.addEventListener("change", function() {
            savedGoals[input.dataset.goalCheck] = input.checked;
            localStorage.setItem(savedGoalsKey, JSON.stringify(savedGoals));
            updateGoalsCount();
        });
    });

    updateGoalsCount();
}

function setupPageTransitions() {
    const transitionLinks = document.querySelectorAll('a[href$=".html"], a[href*=".html#"]');

    transitionLinks.forEach(function(link) {
        link.addEventListener("click", function(event) {
            const href = link.getAttribute("href");

            if (!href || href.startsWith("http") || href.startsWith("mailto:")) {
                return;
            }

            event.preventDefault();
            document.body.classList.add("page-leaving");

            window.setTimeout(function() {
                window.location.href = href;
            }, 220);
        });
    });
}

function setupScrollEffects() {
    const backToTop = document.querySelector("[data-back-to-top]");

    function updateScrollState() {
        const hasScrolled = window.scrollY > 120;

        document.body.classList.toggle("has-scrolled", hasScrolled);

        if (backToTop) {
            backToTop.classList.toggle("is-visible", window.scrollY > 520);
        }
    }

    window.addEventListener("scroll", updateScrollState, { passive: true });
    document.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("wheel", updateScrollState, { passive: true });
    window.addEventListener("touchmove", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    window.setInterval(updateScrollState, 250);
    updateScrollState();

    if (backToTop) {
        backToTop.addEventListener("click", function() {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }
}

function setupAuthPage() {
    const authForm = document.getElementById("authForm");
    const authTabs = document.querySelectorAll("[data-auth-tab]");
    const authName = document.getElementById("authName");
    const authNameField = document.querySelector(".auth-name-field");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const authSubmit = document.getElementById("authSubmit");
    const authMessage = document.getElementById("authMessage");
    let mode = "login";

    if (!authForm) {
        return;
    }

    function setMode(nextMode) {
        mode = nextMode;

        authTabs.forEach(function(tab) {
            tab.classList.toggle("active", tab.dataset.authTab === mode);
        });

        if (authNameField) {
            authNameField.classList.add("is-visible");
        }
        authSubmit.textContent = mode === "register" ? "Criar conta" : "Entrar";
        authMessage.textContent = mode === "register" ? "Crie uma conta demonstrativa para acessar seu perfil." : "Informe seu nome, e-mail e senha para simular o acesso.";
        authMessage.classList.remove("success", "error");
    }

    window.setAuthMode = setMode;

    authTabs.forEach(function(tab) {
        tab.addEventListener("click", function() {
            setMode(tab.dataset.authTab);
        });
    });

    authForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const user = {
            name: authName.value || getSavedProfile().name,
            email: authEmail.value,
            password: authPassword.value
        };

        if (mode === "register") {
            try {
                const registeredUser = await requestAuth("/api/register", user);

                localStorage.setItem(savedAuthKey, JSON.stringify(registeredUser));
                authMessage.textContent = "Conta criada com sucesso. Você já pode entrar.";
                authMessage.classList.remove("error");
                authMessage.classList.add("success");
                setMode("login");
            } catch (error) {
                if (location.protocol === "file:") {
                    localStorage.setItem(savedAuthKey, JSON.stringify(user));
                    authMessage.textContent = "Conta criada com sucesso. Você já pode entrar.";
                    authMessage.classList.remove("error");
                    authMessage.classList.add("success");
                    setMode("login");
                    return;
                }

                authMessage.textContent = error.message;
                authMessage.classList.remove("success");
                authMessage.classList.add("error");
            }

            return;
        }

        try {
            const loggedUser = await requestAuth("/api/login", user);

            saveLoggedUser(loggedUser);
        } catch (error) {
            if (location.protocol === "file:") {
                const savedUser = getSavedAuthUser();

                if (!savedUser) {
                    authMessage.textContent = "Nenhuma conta foi criada ainda. Crie uma conta para poder entrar.";
                    authMessage.classList.remove("success");
                    authMessage.classList.add("error");
                    return;
                }

                if (savedUser.email && savedUser.email !== user.email) {
                    authMessage.textContent = "Não encontramos uma conta com esse e-mail. Crie uma conta para poder entrar.";
                    authMessage.classList.remove("success");
                    authMessage.classList.add("error");
                    return;
                }

                saveLoggedUser(Object.assign({}, savedUser, user));
            } else {
                authMessage.textContent = error.message;
                authMessage.classList.remove("success");
                authMessage.classList.add("error");
                return;
            }
        }

        authMessage.textContent = "Acesso liberado. Redirecionando para a página inicial...";
        authMessage.classList.add("success");

        window.setTimeout(function() {
            window.location.href = "index.html#inicio";
        }, 650);
    });

    setMode("login");
}

function saveWorkout(workout) {
    localStorage.setItem(savedWorkoutKey, JSON.stringify(workout));
}

function getSavedWorkout() {
    const savedWorkout = localStorage.getItem(savedWorkoutKey);

    if (!savedWorkout) {
        return null;
    }

    return JSON.parse(savedWorkout);
}

function buildWorkoutActions() {
    return "<div class=\"result-actions\"><button class=\"btn btn-primary\" type=\"button\" data-save-workout>Salvar no meu perfil</button><a class=\"btn btn-secondary\" href=\"meu-treino.html\">Ver meu treino</a></div>";
}

function setupWorkoutSaving() {
    document.addEventListener("click", function(event) {
        const saveButton = event.target.closest("[data-save-workout]");

        if (!saveButton || !currentGeneratedWorkout) {
            return;
        }

        saveWorkout(currentGeneratedWorkout);
        saveButton.textContent = "Treino salvo";
        saveButton.disabled = true;
    });
}

function renderSavedWorkoutPage() {
    const container = document.getElementById("savedWorkoutView");

    if (!container) {
        return;
    }

    const savedWorkout = getSavedWorkout();

    if (!savedWorkout) {
        return;
    }

    const summary = "<div class=\"result-summary\"><div class=\"summary-item\"><span>Objetivo</span><strong>" + savedWorkout.goal + "</strong></div><div class=\"summary-item\"><span>Nível</span><strong>" + savedWorkout.level + "</strong></div><div class=\"summary-item\"><span>Frequência</span><strong>" + savedWorkout.days + " dias</strong></div><div class=\"summary-item\"><span>Tempo</span><strong>" + savedWorkout.duration + " min</strong></div><div class=\"summary-item\"><span>Local</span><strong>" + savedWorkout.place + "</strong></div></div>";
    const days = savedWorkout.plan.map(function(day, index) {
        const exercises = day.exercises.map(function(exercise) {
            return "<li>" + formatExerciseWithPrescription(exercise, savedWorkout.level) + "</li>";
        }).join("");

        return "<article class=\"saved-day-card\"><h3>Dia " + (index + 1) + "</h3><p>" + day.title + "</p><ul>" + exercises + "</ul></article>";
    }).join("");

    container.innerHTML = "<article class=\"saved-workout-header\"><div class=\"saved-workout-title\"><div><p class=\"eyebrow\">Treino atual</p><h2>" + savedWorkout.goal + " - " + savedWorkout.days + " dias por semana</h2><p>" + savedWorkout.insight + "</p></div><a class=\"btn btn-secondary\" href=\"index.html#montar\">Gerar outro</a></div>" + summary + "</article><div class=\"saved-days-grid\">" + days + "</div>";
}

function normalizeLevel(level) {
    const normalized = String(level || "").toLowerCase();

    if (normalized.includes("avanc")) {
        return "avancado";
    }

    if (normalized.includes("inter")) {
        return "intermediario";
    }

    return "iniciante";
}

function getStrengthPrescription(level) {
    const prescriptions = {
        iniciante: "2 séries de 12 a 15 repetições",
        intermediario: "3 séries de 10 a 12 repetições",
        avancado: "4 séries de 8 a 10 repetições"
    };

    return prescriptions[normalizeLevel(level)];
}

function getCardioPrescription(level) {
    const prescriptions = {
        iniciante: "8 a 12 minutos em ritmo leve",
        intermediario: "12 a 18 minutos em ritmo moderado",
        avancado: "15 a 25 minutos com intervalos intensos"
    };

    return prescriptions[normalizeLevel(level)];
}

function getMobilityPrescription(level) {
    const prescriptions = {
        iniciante: "2 rodadas de 30 segundos",
        intermediario: "3 rodadas de 30 a 40 segundos",
        avancado: "3 a 4 rodadas de 40 segundos"
    };

    return prescriptions[normalizeLevel(level)];
}

function formatExerciseWithPrescription(exercise, level) {
    const cleanExercise = String(exercise)
        .replace(/\s-\s\d+\sseries?/i, "")
        .replace(/\s-\s\d+\srodadas?/i, "");
    const lowerExercise = cleanExercise.toLowerCase();
    const cardioTerms = ["esteira", "bike", "eliptico", "cardio", "caminhada", "corrida", "polichinelos", "corda"];
    const mobilityTerms = ["mobilidade", "alongamento", "respiracao"];

    if (cardioTerms.some(function(term) { return lowerExercise.includes(term); })) {
        return cleanExercise + " - " + getCardioPrescription(level);
    }

    if (mobilityTerms.some(function(term) { return lowerExercise.includes(term); })) {
        return cleanExercise + " - " + getMobilityPrescription(level);
    }

    if (lowerExercise.includes("prancha") || lowerExercise.includes("dead bug") || lowerExercise.includes("abdominal")) {
        return cleanExercise + " - " + getMobilityPrescription(level);
    }

    return cleanExercise + " - " + getStrengthPrescription(level);
}

function adaptExerciseForPlace(exercise, place) {
    if (place !== "casa") {
        return exercise;
    }

    const homeOptions = {
        "Supino reto": "Flexão de braços",
        "Supino inclinado": "Flexão inclinada",
        "Supino": "Flexão de braços",
        "Supino maquina": "Flexão de braços",
        "Supino máquina": "Flexão de braços",
        "Crucifixo": "Crucifixo com garrafas ou halteres",
        "Crossover": "Flexão aberta",
        "Puxada frontal": "Remada com toalha ou elástico",
        "Puxada aberta": "Remada com elástico",
        "Pulldown": "Puxada com elástico",
        "Remada baixa": "Remada com mochila",
        "Remada curvada": "Remada com mochila",
        "Remada unilateral": "Remada unilateral com mochila",
        "Remada": "Remada com mochila",
        "Desenvolvimento": "Desenvolvimento com mochila",
        "Elevacao lateral": "Elevação lateral com garrafas",
        "Elevação lateral": "Elevação lateral com garrafas",
        "Triceps pulley": "Triceps banco",
        "Tríceps pulley": "Tríceps banco",
        "Triceps corda": "Triceps banco",
        "Tríceps corda": "Tríceps banco",
        "Triceps testa": "Tríceps acima da cabeça",
        "Tríceps testa": "Tríceps acima da cabeça",
        "Rosca direta": "Rosca com mochila",
        "Rosca alternada": "Rosca com garrafas",
        "Rosca": "Rosca com mochila",
        "Agachamento": "Agachamento livre",
        "Agachamento guiado": "Agachamento livre",
        "Agachamento goblet": "Agachamento com mochila",
        "Leg press": "Agachamento sumo",
        "Cadeira extensora": "Agachamento isométrico",
        "Mesa flexora": "Ponte de glúteos",
        "Stiff": "Stiff com mochila",
        "Panturrilha": "Panturrilha em pé",
        "Bike": "Polichinelos",
        "Bike 12 min": "Polichinelos por 8 a 12 min",
        "Bike 15 min": "Polichinelos por 12 a 15 min",
        "Esteira": "Caminhada ou corrida estacionária",
        "Esteira leve": "Caminhada leve",
        "Esteira intervalada": "Corrida estacionária intervalada",
        "Eliptico": "Corrida estacionária",
        "Kettlebell": "Agachamento com mochila",
        "Step": "Subida no degrau",
        "Corda": "Simulação de corda"
    };

    return homeOptions[exercise] || exercise;
}

        const templates = {
            hipertrofia: {
                3: [
                    { title: "Push: peito, ombros e tríceps", exercises: ["Supino reto", "Desenvolvimento", "Tríceps pulley"] },
                    { title: "Pull: costas e bíceps", exercises: ["Puxada frontal", "Remada baixa", "Rosca direta"] },
                    { title: "Legs: pernas completas e abdômen", exercises: ["Agachamento", "Mesa flexora", "Prancha"] }
                ],
                4: [
                    { title: "Peito e tríceps", exercises: ["Supino inclinado", "Crucifixo", "Tríceps corda"] },
                    { title: "Costas e bíceps", exercises: ["Remada curvada", "Puxada aberta", "Rosca alternada"] },
                    { title: "Pernas completas", exercises: ["Leg press", "Cadeira extensora", "Stiff"] },
                    { title: "Ombros, abdômen e cardio leve", exercises: ["Elevação lateral", "Desenvolvimento", "Esteira leve"] }
                ],
                5: [
                    { title: "Peito", exercises: ["Supino reto", "Supino inclinado", "Crossover"] },
                    { title: "Costas", exercises: ["Puxada frontal", "Remada unilateral", "Pulldown"] },
                    { title: "Pernas", exercises: ["Agachamento", "Leg press", "Panturrilha"] },
                    { title: "Ombros e abdômen", exercises: ["Desenvolvimento", "Elevação lateral", "Abdominal cable"] },
                    { title: "Braços e pontos fracos", exercises: ["Rosca direta", "Tríceps testa", "Exercício corretivo"] }
                ]
            },
            emagrecimento: {
                3: [
                    { title: "Full body com cardio final", exercises: ["Agachamento goblet", "Remada baixa", "Bike 12 min"] },
                    { title: "Pernas e core", exercises: ["Leg press", "Afundo", "Prancha lateral"] },
                    { title: "Circuito metabólico", exercises: ["Supino máquina", "Puxada frontal", "Esteira intervalada"] }
                ],
                4: [
                    { title: "Superior + cardio", exercises: ["Supino máquina", "Remada baixa", "Bike 15 min"] },
                    { title: "Inferior + core", exercises: ["Agachamento", "Cadeira extensora", "Prancha"] },
                    { title: "Full body", exercises: ["Leg press", "Puxada aberta", "Desenvolvimento"] },
                    { title: "Cardio intervalado", exercises: ["Esteira", "Eliptico", "Mobilidade"] }
                ],
                5: [
                    { title: "Full body leve", exercises: ["Agachamento", "Remada", "Supino máquina"] },
                    { title: "Cardio intervalado", exercises: ["Esteira", "Bike", "Mobilidade"] },
                    { title: "Pernas e core", exercises: ["Leg press", "Stiff", "Abdominal"] },
                    { title: "Superior", exercises: ["Puxada", "Desenvolvimento", "Rosca"] },
                    { title: "Circuito metabólico", exercises: ["Kettlebell", "Corda", "Esteira"] }
                ]
            },
            condicionamento: {
                3: [
                    { title: "Full body técnico", exercises: ["Agachamento livre", "Remada", "Desenvolvimento"] },
                    { title: "Cardio e mobilidade", exercises: ["Bike moderada", "Mobilidade de quadril", "Alongamento ativo"] },
                    { title: "Força geral", exercises: ["Levantamento terra", "Supino", "Prancha"] }
                ],
                4: [
                    { title: "Força superior", exercises: ["Supino", "Remada", "Desenvolvimento"] },
                    { title: "Força inferior", exercises: ["Agachamento", "Stiff", "Panturrilha"] },
                    { title: "Mobilidade e core", exercises: ["Mobilidade torácica", "Prancha", "Dead bug"] },
                    { title: "Condicionamento", exercises: ["Esteira", "Bike", "Circuito leve"] }
                ],
                5: [
                    { title: "Força", exercises: ["Agachamento", "Supino", "Remada"] },
                    { title: "Cardio moderado", exercises: ["Esteira", "Bike", "Elíptico"] },
                    { title: "Mobilidade", exercises: ["Quadril", "Tornozelo", "Coluna torácica"] },
                    { title: "Circuito funcional", exercises: ["Step", "Corda", "Kettlebell"] },
                    { title: "Recuperação ativa", exercises: ["Caminhada", "Alongamento", "Respiração"] }
                ]
            }
        };

        document.querySelectorAll("[data-login]").forEach(function(button) {
            button.addEventListener("click", function() {
                window.location.href = loginPage;
            });
        });

        document.querySelectorAll("[data-scroll-target]").forEach(function(button) {
            button.addEventListener("click", function() {
                const target = document.getElementById(button.dataset.scrollTarget);

                if (target) {
                    target.scrollIntoView();
                }
            });
        });

        const workoutForm = document.getElementById("workoutForm");

        if (workoutForm) {
        currentGeneratedWorkout = {
            goal: "Hipertrofia",
            level: "Iniciante",
            profile: "Iniciando",
            days: "3",
            duration: "45",
            place: "Academia",
            insight: "Rotina equilibrada para criar consistência, com volume moderado e exercícios fáceis de acompanhar.",
            plan: [
                { title: "Peito, ombros e tríceps", exercises: ["Supino reto", "Desenvolvimento", "Tríceps pulley"] },
                { title: "Costas e bíceps", exercises: ["Puxada frontal", "Remada baixa", "Rosca direta"] },
                { title: "Pernas completas e core", exercises: ["Agachamento guiado", "Mesa flexora", "Prancha"] }
            ]
        };

        workoutForm.addEventListener("submit", function(event) {
            event.preventDefault();

            const goal = document.getElementById("goal").value;
            const level = document.getElementById("level").value;
            const days = document.getElementById("days").value;
            const profile = document.getElementById("profile").value;
            const duration = document.getElementById("duration").value;
            const place = document.getElementById("place").value;
            const result = document.getElementById("workoutResult");
            const plan = templates[goal][days];
            const intensity = {
                iniciante: "2 a 3 séries por exercício, descanso de 60 a 90 segundos.",
                intermediario: "3 a 4 séries por exercício, com progressão semanal.",
                avancado: "4 séries ou mais, usando técnicas avançadas com controle."
            };
            const goalLabels = {
                hipertrofia: "Hipertrofia",
                emagrecimento: "Emagrecimento",
                condicionamento: "Condicionamento"
            };
            const levelLabels = {
                iniciante: "Iniciante",
                intermediario: "Intermediário",
                avancado: "Avançado"
            };
            const profileLabels = {
                iniciante: "Iniciando",
                retorno: "Voltando a malhar",
                experiente: "Mais experiente"
            };
            const placeLabels = {
                academia: "Academia",
                casa: "Casa"
            };
            const profileAdvice = {
                iniciante: "Priorize técnica, postura e carga leve. O foco inicial é aprender os movimentos com segurança.",
                retorno: "Comece com margem de segurança e aumente o volume aos poucos nas próximas semanas.",
                experiente: "Use a experiência para controlar carga, execução e progressão sem perder qualidade no movimento."
            };
            const durationAdvice = {
                30: "Como o tempo é curto, mantenha pausas objetivas e escolha os exercícios principais.",
                45: "Tempo ideal para treinar com calma, aquecer bem e finalizar sem pressa.",
                60: "Com mais tempo, inclua aquecimento, exercícios acessórios e alongamento leve no final."
            };
            const placeAdvice = {
                academia: "Use máquinas e pesos livres para ajustar carga com mais precisão.",
                casa: "Se treinar em casa, adapte os movimentos para peso corporal, elásticos ou halteres simples."
            };

            const adaptedPlan = plan.map(function(day) {
                return {
                    title: day.title,
                    exercises: day.exercises.map(function(exercise) {
                        return adaptExerciseForPlace(exercise, place);
                    })
                };
            });
            const insightText = profileAdvice[profile] + " " + durationAdvice[duration] + " " + placeAdvice[place];
            currentGeneratedWorkout = {
                goal: goalLabels[goal],
                level: levelLabels[level],
                profile: profileLabels[profile],
                days: days,
                duration: duration,
                place: placeLabels[place],
                insight: insightText,
                plan: adaptedPlan
            };

            const progress = "<div class=\"progress-strip\" aria-label=\"Etapas do plano\"><span>1. Perfil</span><span>2. Objetivo</span><span>3. Rotina</span></div>";
            const summary = "<div class=\"result-summary\"><div class=\"summary-item\"><span>Objetivo</span><strong>" + goalLabels[goal] + "</strong></div><div class=\"summary-item\"><span>Nível</span><strong>" + levelLabels[level] + "</strong></div><div class=\"summary-item\"><span>Frequência</span><strong>" + days + " dias</strong></div><div class=\"summary-item\"><span>Tempo</span><strong>" + duration + " min</strong></div><div class=\"summary-item\"><span>Local</span><strong>" + placeLabels[place] + "</strong></div></div>";
            const insight = "<div class=\"plan-insight\"><strong>Leitura do plano para " + profileLabels[profile] + "</strong><p>" + insightText + "</p></div>";
            const note = "<p class=\"workout-note\">Use a sugestão como base acadêmica do projeto. Na vida real, treino deve respeitar orientação profissional e limites individuais.</p>";

            result.innerHTML = progress + summary + insight + adaptedPlan.map(function(day, index) {
                const exercises = day.exercises.map(function(exercise) {
                    return "<li>" + formatExerciseWithPrescription(exercise, level) + "</li>";
                }).join("");

                return "<article class=\"workout-day\"><h3>Dia " + (index + 1) + "</h3><p>" + day.title + ". " + intensity[level] + "</p><ul>" + exercises + "</ul></article>";
            }).join("") + note + buildWorkoutActions();
        });
        }

setupUserProfile();
setupUserGoals();
setupAuthState();
setupWorkoutSaving();
renderSavedWorkoutPage();
setupPageTransitions();
setupThemeToggle();
setupScrollEffects();
setupAuthPage();
