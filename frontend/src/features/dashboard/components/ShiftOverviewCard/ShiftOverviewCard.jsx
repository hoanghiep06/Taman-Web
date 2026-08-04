import styles from "./ShiftOverviewCard.module.css";

export const ShiftOverviewCard = ({

    shift,

    start,

    end,

    completed

})=>{

    return(

        <div className={styles.card}>

            <h2>Ca trực</h2>

            <h1>{shift}</h1>

            <p>

                {start} - {end}

            </p>

            <div className={styles.progress}>

                <div

                    className={styles.bar}

                    style={{

                        width:`${completed}%`

                    }}

                />

            </div>

            <span>{completed}% hoàn thành</span>

        </div>

    );

}