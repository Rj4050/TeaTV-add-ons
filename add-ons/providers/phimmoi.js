const URL = {
    DOMAIN: "http://www.phimmoi.net",
    SEARCH: (title) => {
        return `http://www.phimmoi.net/tim-kiem/${title}/`;
    },
    HEADERS: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
    }
};



class Phimmoi {
    constructor(props) {
        this.libs = props.libs;
        this.movieInfo = props.movieInfo;
        this.settings = props.settings;

        this.state = {};
    }



    async searchDetail() {
        const { httpRequest, cheerio, stringHelper, qs }    = this.libs; 
        let { title, year, season, episode, type }      = this.movieInfo;

        let detailUrl = false;
        let videoUrl = false;
        let tvshowDetailUrl = false;

        let urlSearch = '';

        urlSearch = URL.SEARCH(stringHelper.convertToSearchQueryString(title, '+'));

        let htmlSearch = await httpRequest.getHTML(urlSearch, URL.HEADERS);
        let $           = cheerio.load(htmlSearch);

        let itemSearch = $('.list-movie .movie-item');

        itemSearch.each(function() {

            let hrefMovie = URL.DOMAIN + '/' + $(this).find('.block-wrapper').attr('href');
            let titleMovie = $(this).find('.movie-title-2').text();
            let seasonMovie = titleMovie.match(/\( *season *([0-9]+) *\)/i);
            seasonMovie     = seasonMovie != null ? +seasonMovie[1] : false;
            titleMovie      = titleMovie.replace(/\( *season *[0-9]+ *\)/i, '').trim();

            if( stringHelper.shallowCompare(title, titleMovie) ) {

                if( type == 'movie' ) {
                    videoUrl = hrefMovie;
                    return;
                } else if( type == 'tv' && season == seasonMovie ) {
                    videoUrl = hrefMovie;
                    return;
                }
            }
        });

        if( videoUrl != false ) {

            let htmlVideo = await httpRequest.getHTML(videoUrl, URL.HEADERS);
            let $_2       = cheerio.load(htmlVideo);

            let hrefVideo = URL.DOMAIN + '/' + $_2('#btn-film-watch').attr('href');
            let yearMovie = $_2('.movie-title .title-year').text();
            yearMovie     = yearMovie.match(/([0-9]+)/i);
            yearMovie     = yearMovie != null ? +yearMovie[1] : 0;

            if( type == 'movie' && yearMovie == year && hrefVideo ) {

                detailUrl = [hrefVideo];
            } else if( type == 'tv' && hrefVideo ) {
                tvshowDetailUrl = hrefVideo;
            }
        }

        if( type == 'tv' && tvshowDetailUrl != false ) {

            let htmlTvshow = await httpRequest.getHTML(tvshowDetailUrl, URL.HEADERS);
            let $_2        = cheerio.load(htmlTvshow);
            let arrLinkEpisode = [];

            let listServer = $_2('.episode');

            listServer.each(function() {

                let hrefEpisode = URL.DOMAIN + '/' + $_2(this).find('.btn-episode').attr('href');
                let numberEpisode = $_2(this).find('.btn-episode').attr('data-number');

                if( numberEpisode && numberEpisode == episode ) {
                    arrLinkEpisode.push(hrefEpisode);
                }
            }); 

            detailUrl = arrLinkEpisode;
        }

        this.state.detailUrl = detailUrl;
        return;
    }



    async getHostFromDetail() {
        const { httpRequest, cheerio, qs } = this.libs;
        if(!this.state.detailUrl) throw new Error("NOT_FOUND");

        const phimmoi = this;

        let arrDirect = [];
        let hosts       = [];
        let {type}      = this.movieInfo;
        
        let arrPromise = this.state.detailUrl.map(async function(val) {

            let currentEpisode={};
            let filmInfo={};
            let htmlVideo = await httpRequest.getHTML(val, URL.HEADERS);
            let $         = cheerio.load(htmlVideo);

            let infoScript = $("script:contains(var filmInfo={})");
            let infoScriptString = infoScript.html().replace("<!--","").replace("-->","");
            infoScriptString = infoScriptString.replace('var currentEpisode={};', '');
            infoScriptString = infoScriptString.replace('var filmInfo={};', '');
            infoScriptString = infoScriptString.replace('if(typeof filmInfo=="undefined")', '');
            infoScriptString = infoScriptString.replace('if(typeof currentEpisode=="undefined")', '');
            eval(infoScriptString);
            let decodeScript = $("script:contains(;eval)");
            let decodeScriptString = decodeScript.html();

            const getToken = (string) => {
                let window = {};
                let document = {write: () => {}};
                eval(string);
                return window.TOKEN_EPISODE;
            }

            let episodeUrl = `http://episode.phimmoi.net/episodeinfo-v1.2.php?ip=&episodeid=${currentEpisode.episodeId}&number=1&part=0&filmid=${filmInfo.filmId}&filmslug=${filmInfo.url}&type=javascript&requestid=${currentEpisode.requestId}&token=${getToken(decodeScriptString)}&type=json`;
            let jsonDirect = await httpRequest.getHTML(episodeUrl, URL.HEADERS);
            jsonDirect      = JSON.parse(jsonDirect);

            let bk       = jsonDirect.medias;
            let bk2      = jsonDirect.mediasBk2;
            let bk3      = jsonDirect.mediasBk;
            
            for( let item in bk ) {

                bk[item].url && hosts.push({
                    provider: {
                        url: phimmoi.state.detailUrl[0],
                        name: "phimmoi"
                    },
                    result: {
                        file: bk[item].url,
                        label: bk[item].resolution + 'p',
                        type: 'direct'
                    }
                });
            }
            for( let item in bk2 ) {
                bk2[item].url && hosts.push({
                    provider: {
                        url: phimmoi.state.detailUrl[0],
                        name: "phimmoi"
                    },
                    result: {
                        file: bk2[item].url,
                        label: bk2[item].resolution + 'p',
                        type: 'direct'
                    }
                });
            }
            for( let item in bk3 ) {
                bk3[item].url && hosts.push({
                    provider: {
                        url: phimmoi.state.detailUrl[0],
                        name: "phimmoi"
                    },
                    result: {
                        file: bk3[item].url,
                        label: bk3[item].resolution + 'p',
                        type: 'direct'
                    }
                });
            }
        });

        await Promise.all(arrPromise);


        // if( elid != false ) {

        //     let dataBody = {
        //         action: actionEmbed,
        //         idEl: elid,
        //         token: URL.TOKEN_API_EMBED,
        //         nopop: ''
        //     };
        //     // let resultApi = await httpRequest.postCloudflare(URL.EMBED_URL, {}, dataBody);
        //     let resultApi = await httpRequest.post(URL.EMBED_URL, {
        //         'accept': 'application/json, text/javascript, */*; q=0.01',
        //         'content-type':'application/x-www-form-urlencoded; charset=UTF-8'
        //     }, qs.stringify(dataBody));
            
        //     if( resultApi.data == 'Invalid request, your IP have been reported!' ) throw new Error('NOT LINK');

        //     for( let item in resultApi.data ) {

        //         let embed   = resultApi.data[item].embed.match(/src="([^"]*)/i);
        //         embed       = embed != null ? embed[1] : false;

        //         embed && hosts.push({
        //             provider: {
        //                 url: this.state.detailUrl,
        //                 name: "flixanity"
        //             },
        //             result: {
        //                 file: embed,
        //                 label: "embed",
        //                 type: this.isEmbed(embed) ? "embed" : 'direct'
        //             }
        //         });
        //     }
        // }

        this.state.hosts = hosts;
        return;
    }



    isEmbed(link) {

        if( link.indexOf('statics2.vidcdn.pro') != -1 ) {
            return false;
        } else if( link.indexOf('stream2.m4ukido.com') != -1 ) {
            return false;
        } 


        return true;
    }


}

exports.default = async (libs, movieInfo, settings) => {

    const phimmoi = new Phimmoi({
        libs: libs,
        movieInfo: movieInfo,
        settings: settings
    });
    await phimmoi.searchDetail();
    await phimmoi.getHostFromDetail();
    return phimmoi.state.hosts;
}

exports.testing = Phimmoi;