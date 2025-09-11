// Countdown Script
const countdown = document.getElementById("countdown");
const targetDate = new Date("May 14, 2027 12:00:00").getTime();

function updateCountdown() {
  const now = new Date().getTime();
  const distance = targetDate - now;

  if (distance < 0) {
    countdown.innerHTML = "Het Samenzijn is begonnen! 🎉";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  countdown.innerHTML = `${days} dagen, ${hours} uur, ${minutes} min, ${seconds} sec`;
}

updateCountdown();
setInterval(updateCountdown, 1000);
