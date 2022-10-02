/**
 * Ethereum provider download waiting function.
 * @return {Promise<any>}
 */
export default function waitingEthereumPromise () {
    return new Promise<any>(resolve => {
        let attempts = 0;

        const interval = setInterval(() => {
            attempts++;

            if (attempts > 10) {
                clearInterval(interval);
                resolve(undefined);

                return;
            }

            if ((window as any).ethereum) {
                resolve((window as any).ethereum);
                clearInterval(interval);

                return;
            }
        }, 100);
    });
}
