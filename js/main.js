$(function() {
    $("#controls")
        .draggable({cursor: "move"})
        .mouseenter(function() {
           $(this).css('opacity', 1);
        })
        .mouseleave(function() {
            $(this).css('opacity', .7);
        });
});
