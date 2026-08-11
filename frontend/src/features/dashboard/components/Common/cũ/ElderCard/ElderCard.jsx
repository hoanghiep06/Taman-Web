import styles from "./ElderCard.module.css";

export const ElderCard = ({ elder }) => {

    return(

        <div className={styles.card}>

            <h3>

                {elder.name}

            </h3>

            <p>

                Phòng {elder.room}

            </p>

            <div className={styles.grid}>

                <div>

                    ❤️

                    {elder.heartRate}

                </div>

                <div>

                    🩸

                    {elder.bloodPressure}

                </div>

                <div>

                    🌡️

                    {elder.temperature}

                </div>

            </div>

        </div>

    );

};