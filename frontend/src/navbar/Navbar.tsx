//import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Navbar.css"

const TestButton = () => {
  const handleClick = async () => {
    try {
      const response = await fetch('https://scrabble.brimveyn.dev/api/getUsers', {
        method: 'GET', // or 'POST' depending on your backend setup
        headers: {
          'Content-Type': 'application/json',
          // Add any other headers you might need (e.g., Authorization)
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Response from backend:', data);
      alert('Backend is connected!');
    } catch (error) {
      console.error('There was a problem with the fetch operation:', error);
      alert('Error connecting to the backend!');
    }
  };

  return (
    <button onClick={handleClick}>Test Backend Connection</button>
  );
};

//function loginButton () {
//	const [loginShown, setLoginShown] = useState<boolean>(false);
//
//	useEffect(() => {
//		if (!loginShown) return;
//	}, [loginShown]);
//
//
//	const showLoginModal = () => {
//		setLoginShown((prev: boolean) => !prev);
//	}
//
//	return (
//		<button onClick={() => showLoginModal()} className="loginButton">Se connecter</button>
//	)
//}

function Navbar() {
	const { t } = useTranslation("navbar");

	return (
		<div className="navbarContainer">
			<div className="logo">
				<h1>Logo</h1>
				<TestButton/>
			</div>
			<div className="links">
				<p>{t("home")}</p>
				<p>{t("leaderboard")}</p>
				<p>{t("login")}</p>
			</div>
		</div>
	);
}

export default Navbar;
