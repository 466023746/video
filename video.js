import BaseComponent from 'mobileweb-helper/widget/BaseComponent.js';
import tpl from './video.html';
import './video.mcss';
import _ from 'mobileweb-helper/extend/util.js';
import ut from '../../../../widget/util';

// 百度、uc不支持blob播放
const supportBlob = !ut.isBaidu() && !ut.isUc();
// 百度、uc、qq的video总在最顶层
const topIndex = ut.isUc() || ut.isBaidu() || ut.isQQ() || ut.isAndroidWx();
// uc、android微信暂停后video总在最下层
const bottomIndex = ut.isUc() || ut.isAndroidWx();

let content = BaseComponent.extend({
    template: tpl,
    config(data) {
        this.data = _.extend({
            index: 0,       // 在父元素中的索引，父元素通过该index查找改组件
            loading: true,
            fail: false,
            videoInfo: null,
            blobUrl: '',
            video: {},
            videoShow: false,
            progressBar: {},
            videoStatus: 1,      // 1 未开始 2 播放中 3 暂停中 4 加载中 5 已结束
            index2Show: true,
            bottomShow: '',
            index1HideTimeout: '',
            INDEX1_HIDE_TIMEOUT: 2000,
            dotWidth: 10,
            wifiInfo: '当前非wif播放，请注意流量消耗',
            showWifiInfo: false,
            wifiInfoHideTimeout: 2000,
            isIosUc: ut.isIosUc(),
            loadBeforePlay: false   // 先全部加载完再播放
        }, data);

        this.cancelIndex1HideTimeout = this.cancelIndex1HideTimeout.bind(this);
        this.startIndex1HideTimeout = this.startIndex1HideTimeout.bind(this);

        this.startBtnClick = this.startBtnClick
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.restartBtnClick = this.restartBtnClick
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.pauseBtnClick = this.pauseBtnClick
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.containerClick = this.containerClick
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.progressAreaClick = this.progressAreaClick
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.fullScreenClick = this.fullScreenClick
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.initStatus = this.initStatus
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.dotTouchMove = this.dotTouchMove
            ._communityBefore(this.cancelIndex1HideTimeout);

        this.dotTouchEnd = this.dotTouchEnd
            ._communityAfter(this.startIndex1HideTimeout);
    },
    init() {
        let video = this.$refs.video;
        let progressBar = this.$refs.progressBar;
        let {data} = this;

        video.duration = 0;
        video.currentTime = 0;

        video.addEventListener('durationchange', () => {
            this.$update();
        });

        video.addEventListener('timeupdate', () => {
            this.$update();
        });

        video.addEventListener('progress', () => {
            this.$update();
        });

        video.addEventListener('pause', () => {
            if (data.videoStatus != 1) {
                data.videoStatus = 3;
                this.$update();
            }
        });

        // 非初始化时，隐藏自定义控件，用原生控件
        if (topIndex) {
            this.$watch('index2Show', (val) => {
                let {data} = this;
                let {videoStatus} = data;

                if (val == true && videoStatus != 1) {
                    data.index2Show = false;
                    this.$update();
                }
            });
        };

        video.addEventListener('playing', () => {
            data.videoStatus = 2;
            // 非初始化时，隐藏自定义控件，用原生控件
            if (topIndex) {
                data.index2Show = false;
            }
            this.$update();
        });

        video.addEventListener('ended', function() {
            data.index2Show = true;
            data.videoStatus = 5;
            this.$update();
        }.bind(this)._communityAfter(this.cancelIndex1HideTimeout)
        );

        data.video = video;
        data.progressBar = progressBar;
    },
    computed: {
        getClass(data) {
            let {videoInfo, fail} = data;
            let {width, height} = videoInfo;
            let ret;

            if (width / height > 1) {
                ret = 'm-video-cell--horizontal';
            } else {
                ret = 'm-video-cell--vertical';
            }

            if (fail) {
                ret += ' m-video-cell--fail';
            }

            return ret;
        },
        getSrc(data) {
            let {videoInfo, blobUrl, loadBeforePlay} = data;
            let {transcodeUrl, originalUrl} = videoInfo;

            if (!supportBlob) {
                if (transcodeUrl) {
                    return transcodeUrl;
                }
                return originalUrl;
            } 
            if (loadBeforePlay) {
                if (blobUrl) {
                    return blobUrl;
                }
            } else {
                if (transcodeUrl) {
                    return transcodeUrl;
                }
            }
            return '';
            
        },
        needControl() {
            return topIndex;
        },
        err1Show(data) {
            let {fail} = data;

            return fail;
        },
        err2Text(data) {
            let {videoInfo} = data;
            let {transcodeState, processState} = videoInfo;

            if (processState == 2) {
                return '视频含有敏感信息，请重新上传';
            } 
            if (transcodeState == 0) {
                return '视频转码中...';
            } else if (transcodeState == 2) {
                return '视频转码失败，请重新上传';
            }
            
            return '';
        },
        index1Show(data) {
            let {videoStatus} = data;
            let arr = [1, 3, 4, 5];

            return arr.indexOf(videoStatus) > -1;
        },
        startBtnShow(data) {
            let {videoStatus} = data;
            let arr = [1, 3];

            return arr.indexOf(videoStatus) > -1;
        },
        pauseBtnShow(data) {
            let {videoStatus} = data;

            return videoStatus == 2;
        },
        loadingBtnShow(data) {
            let {videoStatus} = data;

            return videoStatus == 4;
        },
        replayBtnShow(data) {
            let {videoStatus} = data;

            return videoStatus == 5;
        },
        middleTotalTimeShow(data) {
            let {videoStatus} = data;

            return videoStatus == 1;
        },
        middleRestartTextShow(data) {
            return data.videoStatus == 5;
        },
        currentTimeText(data) {
            let {video} = data;

            return this.formatTime(video.currentTime);
        },
        middleDurationText(data) {
            let {videoInfo} = data;

            return this.formatTime(videoInfo.durationSeconds);
        },
        bottomDurationText(data) {
            let {video} = data;

            return this.formatTime(video.duration);
        },
        currentDotTranslate(data) {
            let {video, progressBar, dotWidth} = data;
            let progress = video.currentTime / video.duration;
            let delta = progress * progressBar.offsetWidth - dotWidth / 2;

            return this.getTranslate('X', delta.toFixed(0));
        },
        currentProgressWidth(data) {
            let {video} = data;
            let progress = video.currentTime / video.duration;

            return this.toPercent(progress);
        },
        buffered(data) {
            let {video} = data;

            return new Array(video.buffered && video.buffered.length || 0);
        },
        bufferedShow(data) {
            let {video} = data;

            return video.duration && video.buffered && video.buffered.length;
        },
        bufferedTranslate(data) {
            return (i) => {
                let {video, progressBar} = data;
                let {buffered} = video;
                let start = buffered.start(i);
                let delta = start / video.duration * progressBar.offsetWidth;
                let ret;

                ret = this.getTranslate('X', delta.toFixed(1));

                return ret;
            };
        },
        bufferedWidth(data) {
            return (i) => {
                let {video} = data;
                let {buffered} = video;
                let start = buffered.start(i);
                let end = buffered.end(i);
                let ret;

                ret = `${this.toPercent((end - start) / video.duration)} `;

                return ret;
            };
        },
        bottomShow(data) {
            let {videoStatus} = data;
            let arr = [2, 3];

            return arr.indexOf(videoStatus) > -1;
        }
    },
    startIndex1HideTimeout() {
        this.data.index1HideTimeout = setTimeout(() => {
            this.data.index2Show = false;
            this.$update();
        }, this.data.INDEX1_HIDE_TIMEOUT);
    },
    cancelIndex1HideTimeout() {
        clearTimeout(this.data.index1HideTimeout);
    },
    startBtnClick(e, noHide) {
        let {data} = this;
        let {video, needShowWifi, wifiInfoHideTimeout, index, blobUrl, loadBeforePlay} = data;

        e.stopPropagation();
        if (loadBeforePlay && !blobUrl) {
            video.load();
        }

        let handle = function() {
            if (needShowWifi) {
                data.showWifiInfo = true;
                this.$emit('hasShowWifi');

                setTimeout(() => {
                    data.showWifiInfo = false;
                    this.$update();
                }, wifiInfoHideTimeout);
            }
            this.$emit('videoPlay', index);
            this.$update();
            if (!noHide) {
                this.startIndex1HideTimeout();
            }
        }.bind(this);

        if (loadBeforePlay) {
            this.getBlobWrapper(() => {
                data.videoShow = true;
                this.playVideo(handle);
            });
        } else {
            data.videoShow = true;
            this.playVideo(handle);
        }
    },
    playVideo(handle) {
        let {data} = this;
        let {video} = data;

        let promise = video.play();

        if (this.isPromise(promise)) {
            promise.then(() => {
                handle && handle();
            }).catch(() => {

            });
        } else {
            handle && handle();
        }
    },
    restartBtnClick(e) {
        let {data} = this;
        let {video, loadBeforePlay} = data;

        e.stopPropagation();

        data.fail = false;
        data.index2Show = true;
        this.$update();
        if (loadBeforePlay) {
            video.load();
        }

        if (loadBeforePlay) {
            this.getBlobWrapper(() => {
                data.videoShow = true;
                this.playVideo();
            });
        } else {
            data.videoShow = true;
            this.playVideo();
        }
    },
    pauseBtnClick(e) {
        let {data} = this;
        let {video} = data;

        e.stopPropagation();
        video.pause();
    },
    containerClick(e) {
        let {data} = this;
        let {videoStatus, video} = data;

        if (videoStatus == 1 || videoStatus == 5) {
            return this.startBtnClick(e);
        }
        // uc在暂停后视频貌似层级在最下面，导致点到的实际是container，所以在这边触发播放
        if (bottomIndex && videoStatus == 3) {
            return this.playVideo(video);
        }
        e.stopPropagation();
        if (videoStatus == 4) {
            return;
        }
        if (videoStatus == 3) {
            data.index2Show = true;
            return;
        }

        data.index2Show = !data.index2Show;
        if (data.index2Show) {
            this.startIndex1HideTimeout();
        }
    },
    bottomClick(e) {
        e.stopPropagation();
    },
    progressAreaClick(e) {
        let {data} = this;
        let {video, progressBar} = data;

        e.stopPropagation();
        video.currentTime = e.event.offsetX / progressBar.offsetWidth * video.duration;
        this.playVideo(video);
    },
    dotTouchStart(e) {
        e.preventDefault();
    },
    dotTouchMove(e) {
        let {data} = this;
        let {video, progressBar} = data;

        e.preventDefault();
        e.stopPropagation();

        let time = (e.event.touches[0].clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth * video.duration;
        if (time < 0) {
            time = 0;
        }
        if (time > video.duration) {
            time = video.duration;
        }
        video.currentTime = time;
    },
    dotTouchEnd(e) {
        e.preventDefault();

        let {data} = this;
        let {video} = data;

        this.playVideo(video);
    },
    fullScreenClick(e) {
        e.stopPropagation();
        let {data} = this;
        let {video} = data;

        this.startBtnClick(e, 1);
        this.toFullVideo(video);
    },
    formatTime(sec) {
        sec = sec || 0;
        sec = parseInt(sec);
        let hour = sec > 3600 ? parseInt(sec / 3600) : 0;
        sec -= 3600 * hour;
        let minute = sec > 60 ? parseInt(sec / 60) : 0;
        sec -= 60 * minute;

        let result = '';
        if (hour) {
            result += hour + ':';
        }
        result += (minute < 10 ? ('0' + minute) : minute) + ':';
        result += sec < 10 ? ('0' + sec) : sec;

        return result;
    },
    getTranslate(type, x, y) {
        type = type || 'X';
        // let result = [];

        let str = `translate${type}(${x}px)`;
        if (!this.isUndefined((y))) {
            str = `translate${type}(${x}px, ${y}px)`;
        }

        return str;

        // let prefix = ['-webkit-', ''];
        // prefix.forEach(function (p) {
        //     result.push(`${p}transform: ${str}`);
        // });

        // return result.join(',');
    },
    toPercent(num) {
        return num.toFixed(3) * 100 + '%';
    },
    isUndefined(obj) {
        return obj === undefined;
    },
    getBlob() {
        let {data} = this;
        let {blobUrl, videoInfo} = data;
        let {transcodeUrl, originalUrl} = videoInfo;
        let url = transcodeUrl || originalUrl;

        let onSuccess = function(blobUrl) {
            data.blobUrl = blobUrl;
            data.videoShow = true;
            this.$update();
        }.bind(this);

        // 1表示已经取过数据
        if (!supportBlob) {
            return onSuccess('1');
        }
        if (blobUrl) {
            return onSuccess(blobUrl);
        }

        return new Promise((resolve, reject) => {
            data.videoStatus = 4;
            this.$update();

            let onSuccessAsync = function(blobUrl) {
                data.blobUrl = blobUrl;
                this.$update();
                resolve();
            }.bind(this);

            this.getData(url).then((blobUrl) => {
                onSuccessAsync(blobUrl);
            }).catch(() => {
                data.fail = true;
                this.$update();
                reject();
            });
        });
    },
    getBlobWrapper(cb) {
        let res = this.getBlob();

        if (this.isPromise(res)) {
            res.then(cb);
        } else {
            cb();
        }
    },
    isPromise(obj) {
        return obj && obj.then;
    },
    getData(url) {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.responseType = 'blob';

            req.onload = function() {
                if (this.status === 200) {
                    const videoBlob = this.response;
                    const blobUrl = URL.createObjectURL(videoBlob);
                    return resolve(blobUrl);
                }
                reject();
            };
            req.onerror = function() {
                reject();
            };
            req.send();
        });
    },
    toFullVideo(videoDom){
        if (videoDom.requestFullscreen) {
            return videoDom.requestFullScreen();
        } else if (videoDom.webkitRequestFullScreen) {
            return videoDom.webkitRequestFullScreen();
        } else if (videoDom.mozRequestFullScreen) {
            return videoDom.mozRequestFullScreen();
        } else if (videoDom.msRequestFullscreen) {
            return videoDom.msRequestFullscreen();
        } else if (videoDom.webkitEnterFullScreen) {
            // safari
            return videoDom.webkitEnterFullScreen();
        }
    },
    isPlaying() {
        let {data} = this;
        let {videoStatus} = data;

        return videoStatus == 2;
    },
    initStatus() {
        let {data} = this;
        let {video} = data;

        video.pause();
        data.videoStatus = 1;
        data.videoShow = false;
        data.index2Show = true;
        this.$update();
    }
});

export default content;