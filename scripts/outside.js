var outside = (function(outside) {
    "use strict";

    var status = function() {
        var container = undefined;
        var page = undefined;
        var indexPosition = undefined;
        var indexCount = undefined;

        return {
            "init": function() {
                container = document.querySelector("#status");
                page = document.querySelector("#status-page");
                indexPosition = document.querySelector("#status-index span:first-child");
                indexCount = document.querySelector("#status-index span:last-child");
            },
            "setPage": function(s) {
                page.textContent = s;
            },
            "setIndexPosition": function(i) {
                indexPosition.textContent = i;
            },
            "setIndexCount": function(i) {
                indexCount.textContent = i;
            },
            "setProgress": function(v) {
                container.style.backgroundSize = (v * 100) + "% 100%";
            }
        };
    }();

    var pages = function() {
        var pages = undefined;
        var currentIndex = undefined;
        var currentPage = undefined;
        var currentProgress = undefined;

        var loadPages = function() {
            var pages = document.querySelectorAll(".page");
            for (var i = 0; i < pages.length; i++) {
                pages[i].hidden = true;
            }

            return pages;
        };

        var nextPage = function() {
            currentPage.hidden = true;
            currentIndex++;
            if (currentIndex >= pages.length) {
                currentIndex = 0;
            }

            currentPage = pages[currentIndex];
            currentPage.hidden = false;

            status.setPage(currentPage.dataset.name);
            status.setIndexPosition(currentIndex + 1);  // 1-index for the user
        };

        var updateProgress = function(d) {
            currentProgress += d;
            if (currentProgress >= 1) {
                currentProgress = 0;
                nextPage();
            }

            status.setProgress(currentProgress);
        };

        return {
            "init": function() {
                pages = loadPages();
                currentIndex = -1;
                currentPage = pages[0];
                currentProgress = 0;

                status.setIndexCount(pages.length);

                nextPage();
                setInterval(updateProgress.bind(null, 0.003), 50);
            }
        };
    }();

    var scoresPage = function() {
        var table = undefined;

        var update = function() {
            srobo.competition.scores("league", function(scores) {
                var tbody = document.createElement("tbody");

                var i = 0;
                var tr = document.createElement("tr");
                for (var tla in scores["league_points"]) {
                    var score = scores["league_points"][tla];

                    var td0 = document.createElement("th");
                    td0.textContent = tla;
                    td0.style.paddingLeft = "48px";
                    tr.appendChild(td0);
                    var td1 = document.createElement("td");
                    td1.textContent = score;
                    td1.style.paddingRight = "48px";
                    tr.appendChild(td1);

                    i++;
                    if (i > 4) {
                        tbody.appendChild(tr);
                        tr = document.createElement("tr");
                        i = 0;
                    }
                }

                tbody.appendChild(tr);
                table.replaceChild(tbody, table.querySelector("tbody"));
            });
        };

        return {
            "init": function() {
                table = document.querySelector("#pages-scores table");

                update();
                setInterval(update, 30 * 1000);
            }
        };
    }();

    var leaderboardPage = function() {
        var table = undefined;
        var upToDateMatch = undefined;
        var teams = undefined;

        var update = function() {
            srobo.competition.scores("league", function(scores) {
                var rows = [];
                for (var tla in scores["league_points"]) {
                    rows.push([tla, scores["league_points"][tla]]);
                }

                rows.sort(function(a, b) {
                    return b[1] - a[1];
                });

                var tbody = document.createElement("tbody");
                rows.forEach(function(row, i) {
                    if (i >= 10) {
                        return;
                    }

                    var tr = document.createElement("tr");
                    var td0 = document.createElement("td");
                    td0.textContent = row[0];
                    tr.appendChild(td0);
                    var td1 = document.createElement("td");
                    td1.textContent = teams[row[0]];
                    tr.appendChild(td1);
                    var td2 = document.createElement("td");
                    td2.textContent = row[1];
                    tr.appendChild(td2);
                    tbody.appendChild(tr);
                });

                table.replaceChild(tbody, table.querySelector("tbody"));

                console.log(scores);
                upToDateMatch.textContent = scores["last_scored"];
            });
        };

        return {
            "init": function() {
                table = document.querySelector("#pages-leaderboard table");
                upToDateMatch = document.querySelector("#pages-leaderboard-match");

                srobo.competition.teams(function(teamsDef) {
                    teams = teamsDef["teams"];
                    update();
                    setInterval(update, 30 * 1000);
                });
            }
        };
    }();

    var knockoutPage = function() {
        var page = undefined;
        var corners = undefined;

        var process_knockout_round = function() {
            var describe_match = function(num_in_round, match_num, rounds_after_this) {
                var description = "Match " + match_num;
                if (rounds_after_this == 2) {
                    description = "Quarter " + num_in_round + " (#" + match_num + ")";
                }
                if (rounds_after_this == 1) {
                    description = "Semi " + num_in_round + " (#" + match_num + ")";
                }
                if (rounds_after_this == 0) {
                    description = "Final (#" + match_num + ")";
                }
                return description;
            };
            var build_game = function(info) {
                return {
                    "arena": info.arena,
                    "teams": info.teams
                };
            };
            var group_games = function(games) {
                // group the given games by number, assuming they're in order.
                var game_groups = [];
                var last_group = null;
                var last_num = null;

                for (var i=0; i<games.length; i++) {
                    var game = games[i];
                    if (last_num == game.num) {
                        last_group.push(game);
                    } else {
                        last_group = [game];
                        last_num   = game.num;
                        game_groups.push(last_group);
                    }
                }

                return game_groups;
            }
            return function(round, rounds_after_this) {

                var game_groups = group_games(round);

                var matches = [];
                for (var i=0; i<game_groups.length; i++) {
                    var match_games = game_groups[i];
                    var number, time;
                    var game_details = [];
                    for (var j=0; j<match_games.length; j++) {
                        var game = match_games[j];
                        if (j == 0) {
                            number = game.num;
                            time = new Date(game.start_time);
                        }
                        game_details.push(build_game(game));
                    }

                    matches.push({
                        'number': number,
                        'description': describe_match(i, number, rounds_after_this),
                        'time': time,
                        'games': game_details
                    });
                }
                return matches;
            };
        }();

        var processKnockouts = function(rounds) {
            var output = [];
            for (var i = 0; i < rounds.length; i++) {
                var roundsAfterThis = rounds.length - i - 1;
                output.push(process_knockout_round(rounds[i], roundsAfterThis));
            }

            return output;
        };

        var update = function() {
            srobo.competition.matches("knockouts", function(res) {
                utils.removeAllChildren(page);

                var rounds = processKnockouts(res.rounds);
                rounds.forEach(function(round) {
                    var roundDiv = document.createElement("div");
                    roundDiv.className = "round";
                    round.forEach(function(match) {
                        var matchDiv = document.createElement("div");
                        var h1 = document.createElement("h1");
                        h1.textContent = match.description;
                        matchDiv.appendChild(h1);

                        match.games.forEach(function(game) {
                            var p = document.createElement("p");
                            var html = "";
                            if (match.games.length > 1) {
                                html = game.arena + ": ";
                            }

                            game.teams.forEach(function(team, i) {
                                html += " <span style=\"color: ";
                                html += corners[i]["colour"];
                                html += "\">";
                                html += team || "—";
                                html += "</span> ";
                            });

                            p.innerHTML = html;

                            matchDiv.appendChild(p);
                        });

                        roundDiv.appendChild(matchDiv);
                    });
                    page.appendChild(roundDiv);
                });
            });
        };

        return {
            "init": function() {
                page = document.querySelector("#pages-knockouts");

                srobo.competition.corners(function(res) {
                    corners = res["corners"];
                    update();
                    setInterval(update, 30 * 1000);
                });
            }
        };
    }();

    var schedulePage = function() {
        var corners = undefined;
        var arenas = undefined;
        var tables = undefined;

        var updateTable = function(arena, table) {
            srobo.competition.matches(arena, "previous,current,next,next+1,next+2,next+3", function(res) {
                var tbody = document.createElement("tbody");

                res["matches"].forEach(function(match, i) {
                    var tr = document.createElement("tr");
                    if (i === 0) {  // previous
                        tr.style.fontStyle = "oblique";
                    }
                    if (i === 1) {  // next
                        tr.style.fontWeight = "bold";
                    }

                    if (!match["error"]) {
                        utils.simpleTableCell(tr, match["num"]);

                        var startTime = new Date(match["start_time"]);
                        utils.simpleTableCell(tr, utils.formatTime(startTime));

                        match["teams"].forEach(function(team, i) {
                            var td = utils.simpleTableCell(tr, team || "—");
                            td.style.color = corners[i].colour;
                        });
                    }

                    tbody.appendChild(tr);
                });

                table.replaceChild(tbody, table.querySelector("tbody"));
            });
        };

        var update = function() {
            for (var i = 0; i < arenas.length; i++) {
                updateTable(arenas[i], tables[i]);
            }
        };

        var createArenaTable = function(arena, arenasCount) {
            var table = document.createElement("table");

            var thead = document.createElement("thead");

            var tr1 = document.createElement("tr");
            var tr2 = document.createElement("tr");

            var th = document.createElement("th");
            th.textContent = "Arena " + arena;
            th.colSpan = 6;
            tr1.appendChild(th);

            th = document.createElement("th");
            th.textContent = "№";
            tr2.appendChild(th);

            th = document.createElement("th");
            th.textContent = "Time";
            tr2.appendChild(th);

            th = document.createElement("th");
            th.textContent = "Teams";
            th.colSpan = 4;
            tr2.appendChild(th);

            if (arenasCount > 1) {
                thead.appendChild(tr1);
            }

            thead.appendChild(tr2);

            table.appendChild(thead);
            table.appendChild(document.createElement("tbody"));

            return table;
        };

        return {
            "init": function() {
                var page = document.querySelector("#pages-schedule");

                srobo.competition.corners(function(res) {
                    corners = res["corners"];

                    srobo.competition.arenas(function(res) {
                        arenas = res["arenas"];

                        tables = arenas.map(function(arena) {
                            var table = createArenaTable(arena, arenas.length);
                            page.appendChild(table);
                            return table;
                        });

                        setInterval(update, 30 * 1000);
                        update();
                    });
                });
            }
        };
    }();

    outside.init = function() {
        status.init();
        pages.init();

        srobo.init(function() {
            scoresPage.init();
            leaderboardPage.init();
            knockoutPage.init();
            schedulePage.init();
        });
    };

    return outside;
}(outside || {}));
