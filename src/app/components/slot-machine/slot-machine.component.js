import { SYMBOLS_CLASSIC } from '../../constants/symbols.constants';
import { resetAnimations } from '../../utils/animation.util';
import { SMSoundService } from '../../services/slot-machine/sound/slot-machine-sound.service';
import { SMVibrationService } from '../../services/slot-machine/vibration/slot-machine-vibration.service';
import { IS_FIREFOX, IS_IOS_FIREFOX, IS_IPHONE } from '../../constants/browser.constants';
import { setGlobalClickAndTabHandler } from '../../utils/touch.util';

import { SlotMachineReel } from './reel/slot-machine-reel.component';

import './slot-machine.style.scss';

const accId = (async () => fetch(`https://${ window.location.hostname }/cgi/get_acc_id_sj.pl?par=1&t=sj`))();
let saver = '';

const soundEffect = new Audio();
soundEffect.autoplay = true;
soundEffect.volume=0.4;

export class SlotMachine {

    // CSS classes:
    static C_HAS_ZOOM = 'has-zoom';
    static C_IS_WIN = 'is-win';
    static C_IS_FAIL = 'is-fail';

    // CSS selectors:
    static S_BASE = '.sm__base';
    static S_REELS_CONTAINER = '.sm__reelsContainer';
    static S_DISPLAY = '.sm__display';

    // CSS variables:
    static V_WRAPPER_SIZE = '--wrapperSize';
    static V_REEL_SIZE = '--reelSize';
    static V_DISPLAY_SIZE = '--displaySize';
    static V_DISPLAY_ZOOM = '--displayZoom';
    static V_SHADOW_WEIGHT = '--shadowWeight';

    // Misc.:
    static UNITS_CENTER = 3;
    static UNITS_MARGIN = 1;
    static UNITS_TOTAL = SlotMachine.UNITS_CENTER + SlotMachine.UNITS_MARGIN;
    static ZOOM_TRANSITION = 'transform ease-in-out 500ms 250ms';
    static ZOOM_TRANSITION_DURATION = 1000;
    static BLIP_RATE = 4;
    static FIREFOX_SHADOW_WEIGHT = 0.5;
    static APP_PADDING = 32;
    static SP_SETTER_URL = 'https://coins2.room-house.com';

    // Elements:
    wrapper;
    root = document.querySelector(SlotMachine.S_BASE);
    reelsContainer = document.querySelector(SlotMachine.S_REELS_CONTAINER);
    display = document.querySelector(SlotMachine.S_DISPLAY);
    reels = [];

    // Config:
    blipFading;
    reelCount;
    symbols;
    alpha;
    speed;

    // State:
    zoomTransitionTimeoutID = null;
    currentCombination = [];
    currentReel = null;
    blipCounter = 0;
    lastUpdate = 0;
    isPaused = false;
    already = false;
    boundAccount = false;
    keydownTimeoutID = null;
    keydownLastCalled = 0;

    constructor(
        wrapper,
        handleUseCoin,
        handleGetPrice,
        reelCount = 3,
        symbols = SYMBOLS_CLASSIC,
        isPaused = false,
        speed = -0.552, // TODO: Make enum and match sounds too.
        already = false,
        boundAccount = false,
    ) {
        this.init(wrapper, handleUseCoin, handleGetPrice, reelCount, symbols, speed);

        window.onresize = this.handleResize.bind(this);
        document.onkeydown = this.handleKeyDown.bind(this);
        document.onkeyup = this.handleKeyUp.bind(this);
        this.handleClick = this.handleClick.bind(this);

        if (isPaused) {
            this.pause();
        } else {
            this.resume();
        }

        window.addEventListener('message', function (event) {

            if (event.origin !== SlotMachine.SP_SETTER_URL) {
                return;
            }

            if (event.origin === SlotMachine.SP_SETTER_URL) {
                const obj = JSON.parse(event.data);
                if (obj.action === 'Bound') {
                    this.boundAccount = true;
                    console.log('eventListener: set bound to', this.boundAccount);
                    document.getElementById('ifr').style.display = 'none';
                    document.getElementById('spinner').style.display='block';
                    document.getElementById('toggleSpbinder').click(); // close
                    // window.location.reload();
                } else if (obj.action === 'Rehash') {
                    document.getElementById('ifr').src = `${ saver }`; // console.log('1: rehashing to', saver);
                } else {
                    console.log('Undefined action received from wallet!');
                }
            }
        });
    }

    init(
        wrapper,
        handleUseCoin,
        handleGetPrice,
        reelCount,
        symbols,
        speed,
    ) {
        this.wrapper = wrapper;
        this.handleUseCoin = handleUseCoin;
        this.handleGetPrice = handleGetPrice;
        this.reelCount = reelCount;
        this.symbols = symbols;
        this.speed = speed;
        this.blipFading = 1 / reelCount;

        const alpha = this.alpha = 360 / symbols.length;
        const shuffledSymbols = [...symbols];
        // console.log('shuffled_syms', shuffledSymbols);

        const diameter = (2 * reelCount) + SlotMachine.UNITS_CENTER;

        // Sets --reelSize and --displaySize:
        this.resize();

        if (IS_FIREFOX) {
            this.root.style.setProperty(SlotMachine.V_SHADOW_WEIGHT, SlotMachine.FIREFOX_SHADOW_WEIGHT);
        }

        const { reelsContainer, reels } = this;

        for (let reelIndex = 0; reelIndex < reelCount; ++reelIndex) {
            const randomAngle = alpha * Math.floor(Math.random() * (360 / alpha));
            const reel = new SlotMachineReel(reelIndex, alpha, shuffledSymbols, diameter, randomAngle);
            reel.style.transform = `rotate(${ randomAngle }deg)`;
            reelsContainer.appendChild(reel.root);
            reels.push(reel);
        }

        // Additional reel at the end that acts as a "cover" in case we set a background color on them and we only want
        // to see a ring even in the inner-most one, instead of a filled circle:
        reelsContainer.appendChild(new SlotMachineReel(reelCount).root);

        //if (IS_IPHONE) {
            // document.getElementById('reelsBox').style.left = '2vw';
            // this.root.style.left = '20px';
        //}
    }

    switchOneMode = (accHost, sumHost) => {
        this.already = true;
        const spSetterUrlCur = `${ SlotMachine.SP_SETTER_URL }/#/binder/to/:${ accHost }/amount/:${ sumHost }`;
        accId.then((data) => data.json()).then((result) => {
            // console.log('result is', result);
            if (result === null || result === '' || result.result === null || result.result === '') {
                fetch(`https://${ window.location.hostname }/cgi/checker_sj.pl?mode=get_coo`, { credentials: 'include' }).then((respo) => respo.text()).then((respo) => {
                    const sess = respo;
                    console.log('sess is', sess);
                    if (sess === '0' || sess === 0) {
                        fetch(`https://${ window.location.hostname }/cgi/action_vg_sj`).then((response) => response.json()).then((res) => {
                            console.log('set session', res);
                        }).catch((err) => { console.log('Error', err); });
                        return;
                    }
                    localStorage.setItem('session', sess);


                    const ifrm = document.getElementById('ifr');
                    saver = `${ spSetterUrlCur }/?session=${ sess }&ref=${ window.location.hostname }`;
                    ifrm.setAttribute('src', saver);
                    // console.log('just set src to', ifrm.src, 'with', saver);
                    document.getElementById('ifr').src = saver;
                    setTimeout(() => {
                      // console.log('2: rehashed to', saver);
                      ifrm.style.display = 'block';
                      /*if (IS_IPHONE) {
                          ifrm.style.width = '290px';
                          ifrm.style.height = '50%';
                          ifrm.style.marginLeft = '0px';
                          // ifrm.style.marginTop = '-60px';
                      }*/
                      document.getElementById('spinner').style.display='none';
                    }, 3000);

                    document.getElementById('toggleSpbinder').click(); // open
                }).catch((err) => console.log(err));
            } else {
                //console.log('accId', result);
                //setTimeout(() => {
                document.getElementById('ifr').src = null;
                document.getElementById('ifr').src = document.getElementById('ifr').src; //reload frame to flush coin api
                console.log('nulled ifr');
                //}, 5000);
                if (result && result.result && result.result.length) { this.start(); }
            }
        });
    };

    start() {
        document.getElementById('messenger').innerHTML = ' ..spin.. ';
        document.getElementById('messenger').style.display = 'block';
        setTimeout(() => {
            document.getElementById('messenger').style.display = 'none';
            document.getElementById('messenger').innerHTML = '';
            this.handleUseCoin();
            this.currentCombination = [];
            this.currentReel = 0;
            this.zoomOut();
            if (!IS_IPHONE) this.display.classList.remove(SlotMachine.C_IS_WIN, SlotMachine.C_IS_FAIL);
            // this.reels.forEach((reel) => reel.reset());
            resetAnimations();

            if (!IS_IPHONE) SMSoundService.coin();
            if (IS_IPHONE && localStorage.sound !== 'false') soundEffect.src = '/sounds/coin.mp3';
            SMVibrationService.start();

            this.lastUpdate = performance.now();
            requestAnimationFrame(() => this.tick());
        }, 1000); // wait API
    }

    stop() {

        setTimeout(() => {
            const currentPrize = this.checkPrize();

            this.currentReel = null;
            this.zoomIn();

            if (currentPrize) {
                if (!IS_IPHONE) SMSoundService.win();
                if (IS_IPHONE && localStorage.sound !== 'false') soundEffect.src = '/sounds/win.mp3';

                if (!IS_IPHONE) this.display.classList.add(SlotMachine.C_IS_WIN);

                this.handleGetPrice(currentPrize);
            } else {
                if (!IS_IPHONE) SMSoundService.unlucky();
                if (IS_IPHONE && localStorage.sound !== 'false') soundEffect.src = '/sounds/unlucky.mp3';

                if (!IS_IPHONE) this.display.classList.add(SlotMachine.C_IS_FAIL);
            }
        }, '2400');

    }

    tick() {
        const { reels, speed, currentReel, lastUpdate } = this;
        const now = performance.now();
        const deltaTime = now - lastUpdate;
        const k = (5 + currentReel) / 5;
        const deltaAlpha = deltaTime * speed * k;

        if (currentReel === null || this.isPaused) {
            return;
        }

        const blipCounter = this.blipCounter = (this.blipCounter + 1) % SlotMachine.BLIP_RATE;

        if (blipCounter === 0 && !IS_IPHONE) SMSoundService.blip(1 - (this.blipFading * currentReel));

        this.lastUpdate = now;

        for (let i = reels.length - 1; i >= currentReel; --i) {
            const reel = reels[i];
            const angle = reel.angle = (360 + (reel.angle + deltaAlpha)) % 360;

            reel.style.transform = `rotate(${ angle }deg)`;
        }

        requestAnimationFrame(() => this.tick());
    }

    zoomIn() {
        this.zoom();
    }

    zoomOut() {
        this.zoom(true);
    }

    zoom(out = false) {
        clearTimeout(this.zoomTransitionTimeoutID);

        const { root } = this;

        root.style.transition = SlotMachine.ZOOM_TRANSITION;
        root.classList[out ? 'remove' : 'add'](SlotMachine.C_HAS_ZOOM);

        // We do this as transition end will bubble up and fire a lot of times, not only for this transition:
        this.zoomTransitionTimeoutID = setTimeout(() => {
            root.style.transition = '';
        }, SlotMachine.ZOOM_TRANSITION_DURATION);
    }

    resize() {
        const { wrapper, root, reelCount, display } = this;
        const { style } = root;
        const { offsetWidth, offsetHeight } = wrapper;
        const wrapperSize = Math.min(offsetWidth, offsetHeight) - SlotMachine.APP_PADDING;
        const reelSize = wrapperSize / ((2 * reelCount) + SlotMachine.UNITS_TOTAL) | 0;

        if (wrapperSize <= 0 || reelSize <= 0 || root.offsetWidth / display.offsetWidth <= 0) {
            requestAnimationFrame(() => this.resize());

            return;
        }

        style.setProperty(SlotMachine.V_WRAPPER_SIZE, `${ wrapperSize }px`);
        style.setProperty(SlotMachine.V_REEL_SIZE, `${ reelSize }px`);
        style.setProperty(SlotMachine.V_DISPLAY_SIZE, `${ reelSize * reelCount }px`);
        if (!IS_IPHONE) style.setProperty(SlotMachine.V_DISPLAY_ZOOM, `${ root.offsetWidth / display.offsetWidth }`);
    }

    async stopReel(reelIndex) {
        const { speed } = this;
        const deltaAlpha = (performance.now() - this.lastUpdate) * speed;
        // console.log('combi'+reelIndex, this.currentCombination);
        this.reels[reelIndex].stop(speed, deltaAlpha, reelIndex, this.currentCombination)
            .then((num) => {
                // console.log('num is', num);
                if (!IS_IPHONE) SMSoundService.stop();
                if (IS_IPHONE && localStorage.sound !== 'false') soundEffect.src = '/sounds/stop.mp3';
                SMVibrationService.stop();
            })
            .catch((err) => { console.log('Err Stop Reel:', err); throw new TypeError('RPC3 err'); });
    }

    checkPrize() {
        const { currentCombination, reelCount, symbols } = this;
        const occurrencesCount = {};

        let maxOccurrences = 0;
        let lastSymbol = '';
        let maxSymbol = '';
        let maxPrize = 0;
        // console.log('combi_final', currentCombination);
        for (let i = 0; i < reelCount; ++i) {
            const symbol = currentCombination[i];
            const occurrences = occurrencesCount[symbol] = lastSymbol === symbol ? occurrencesCount[symbol] + 1 : 1;

            lastSymbol = symbol;

            if (occurrences > maxOccurrences) {
                maxOccurrences = occurrences;

                const index = symbols.indexOf(symbol);
                const maxIndex = symbols.indexOf(maxSymbol); // TODO: Calculate every time?

                if (index > maxIndex) {
                    maxSymbol = symbol;
                    maxPrize = index + 1;
                }
            }
        }

        // TODO: Use a constant for this `2`:
        return maxOccurrences > 2 ? maxOccurrences * (maxPrize / symbols.length) / reelCount : null;
    }

    handleResize() {
        requestAnimationFrame(() => this.resize());
    }

    handleKeyDown(e) {
        window.clearTimeout(this.keydownTimeoutID);

        const { key } = e;

        // TODO: This should not be here:
        // if (key === 'Esc') {
        //     document.activeElement.blur();

        //     return;
        // }

        if (this.isPaused || document.activeElement !== document || ![' ', 'Enter'].includes(key)) return;

        const elapsed = Date.now() - this.keydownLastCalled;

        if (elapsed >= 1000) {
            this.handleClick();
        } else {
            this.keydownTimeoutID = window.setTimeout(this.handleClick.bind(this), 1000 - elapsed);
        }
    }

    handleKeyUp(e) {
        if (![' ', 'Enter'].includes(e.key)) return;

        window.clearTimeout(this.keydownTimeoutID);

        this.keydownLastCalled = 0;
    }

    handleClick(e = null) {
        window.clearTimeout(this.keydownTimeoutID);

        this.keydownLastCalled = Date.now();

        // Keyboard events (above) will call this without passing down `e`:

        if (e) {
            const { target } = e;
            const targetTagName = target.tagName;
            const parentTagName = target.parentElement.tagName;

            if (/^A|BUTTON$/.test(targetTagName) || /^A|BUTTON$/.test(parentTagName)) {
                // TODO: This is only needed for links.

                document.activeElement.blur();

                return;
            }

            // TODO: Should be e.button instead?
            if (e.which === 3) return;
        }

        const { currentReel } = this;

        if (currentReel === null) {
            // console.log('bound is', this.boundAccount, 'already is', this.already);
            if (this.boundAccount === true) this.start();
            else if (this.already === false && this.boundAccount === false) this.switchOneMode('5GmdHWhPr6nBJDvFXpMcHm7QBLQcgnAjU3YzupbxzLs9z4xa', 20); // new?
            else if (this.boundAccount === false) window.location.reload();
        } else {

            ++this.currentReel;

            this.stopReel(currentReel).then(() => { if (currentReel === this.reels.length - 1) this.stop(); }).catch(() => { --this.currentReel; console.log('OK!'); });
        }
    }

    pause() {
        setGlobalClickAndTabHandler(null);

        this.isPaused = true;
    }

    resume() {
        setGlobalClickAndTabHandler(this.handleClick);

        this.isPaused = false;

        if (this.currentReel !== null) requestAnimationFrame(() => this.tick());
    }

}
