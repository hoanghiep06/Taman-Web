import styles from "./VitalAlertList.module.css";

export const VitalAlertList = ({ alerts }) => {

    return (

        <div className={styles.card}>

            <h2>Cảnh báo sức khỏe</h2>

            {

                alerts.map((item,index)=>(

                    <div

                        key={index}

                        className={styles.item}

                    >

                        <div>

                            <strong>

                                {item.name}

                            </strong>

                        </div>

                        <div>

                            {item.message}

                        </div>

                    </div>

                ))

            }

        </div>

    );

};